import path from "path";
import { Router } from "express";
import { Op } from "sequelize";
import { Project } from "../models/Project";
import { MarketingAgent } from "../models/MarketingAgent";
import { authenticateToken } from "../middleware/auth";
import { logAuditAction } from "../utils/auditLogger";
import { publishToFacebook, publishToInstagram } from "../utils/facebook";
import { ensureInstagramCompatibleImage } from "../utils/imageResizer";

function formatPriceRangeDisplay(rawPrice?: string): string {
    if (!rawPrice) return 'Contact for Price';
    let formatted = rawPrice.trim();
    // Expand L to Lakhs and Cr to Crore/Crores for a clean premium look
    formatted = formatted
        .replace(/(\d+)\s*L(?!akh)/gi, '$1 Lakhs')
        .replace(/(\d+)\s*Cr(?!ore)/gi, '$1 Crore')
        .replace(/1\s*Crores/gi, '1 Crore');
    return formatted;
}

async function buildSocialPostMessage(project: any): Promise<string> {
    const locParts = [project.location, project.microLocation, project.city].filter(Boolean);
    const locationStr = locParts.join(", ");
    const cityHash = project.city ? `#${project.city.replace(/\s+/g, '')}` : '';
    const microHash = project.microLocation ? `#${project.microLocation.replace(/\s+/g, '')}` : '';
    const categoryHash = project.category ? `#${project.category.replace(/\s+/g, '')}` : '';
    const hashtagsList = `#RealEstate #VisakhapatnamProperty #JKFutureInfra #Trending #Investment ${cityHash} ${microHash} ${categoryHash} #PlotsForSale #DreamHome`.replace(/\s+/g, ' ').trim();

    const baseUrl = "https://jkfutureinfra.com";
    const propertyDetailUrl = project.id 
        ? `${baseUrl}/project-details?id=${project.id}${project.isMarketing ? '&isMarketing=true' : ''}`
        : baseUrl;

    let phoneNum = "9000553832";
    let agentName = "";
    if (project.isMarketing && project.agentId) {
        const agent = await MarketingAgent.findByPk(project.agentId);
        if (agent?.phone) {
            phoneNum = agent.phone.replace(/\D/g, "");
            agentName = agent.name;
        }
    }
    if (!phoneNum || phoneNum.length < 10) {
        phoneNum = "9000553832";
    }

    const cleanDigits = phoneNum.slice(-10);
    // Short & clean WhatsApp pre-filled text
    const waLink = `https://wa.me/91${cleanDigits}?text=${encodeURIComponent("Hi, I want property details")}`;

    const formattedPrice = formatPriceRangeDisplay(project.priceRange);

    if (project.isMarketing) {
        const agentNameStr = agentName ? `👤 Marketing Agent: ${agentName}\n` : '';
        return `✨ FEATURED PROPERTY SHOWCASE ✨\n\n🏢 Property: ${project.name}\n🏷️ Segment: ${project.category || 'Real Estate'}\n📍 Location: ${locationStr}\n💰 Investment: ${formattedPrice}\n\n📝 Description:\n${project.description || ''}\n\n🔥 READY FOR IMMEDIATE REGISTRATION & SITE VISITS 🔥\n\n👉 🚗 Book a Free Site Visit Today!\n🌐 View Property Details: ${propertyDetailUrl}\n📲 WhatsApp Inquiry: ${waLink}\n${agentNameStr}📞 Call / WhatsApp Agent: +91 ${cleanDigits}\n\n${hashtagsList}`;
    } else {
        return `✨ PREMIUM REAL ESTATE OPPORTUNITY ✨\n\n🏢 Venture: ${project.name}\n🏷️ Category: ${project.category || 'Real Estate'}\n📍 Location: ${locationStr}\n💰 Price Range: ${formattedPrice}\n\n📝 Overview:\n${project.description || ''}\n\n🔥 READY FOR IMMEDIATE REGISTRATION & SITE VISITS 🔥\n\n👉 🚗 Book a Free Site Visit Today!\n🌐 View Property Details: ${propertyDetailUrl}\n📲 WhatsApp Inquiry: ${waLink}\n📞 Call / WhatsApp: +91 ${cleanDigits}\n\n${hashtagsList}`;
    }
}




const router = Router();

// GET all projects (supports filtering by isMarketing, category, status)
router.get("/", async (req, res, next) => {
    try {
        const { isMarketing, category, status } = req.query;
        const whereClause: any = {};

        if (isMarketing !== undefined) {
            whereClause.isMarketing = isMarketing === "true";
        }
        if (category) {
            whereClause.category = category;
        }
        if (status) {
            whereClause.status = status;
        }

        const projects = await Project.findAll({
            where: whereClause,
            order: [["createdAt", "DESC"]]
        });

        return res.json({ success: true, data: projects });
    } catch (error) {
        next(error);
    }
});

// GET single project by ID
router.get("/:id", async (req, res, next) => {
    try {
        const project = await Project.findByPk(req.params.id);
        if (!project) {
            return res.status(404).json({ success: false, message: "Project not found" });
        }
        return res.json({ success: true, data: project });
    } catch (error) {
        next(error);
    }
});

// POST create project
router.post("/", authenticateToken, async (req, res, next) => {
    try {
        const { autoPostSocial, ...projectData } = req.body;

        // Duplicate validation: same name + city + microLocation
        if (projectData.name && projectData.city) {
            const where: any = {
                name: { [Op.iLike]: projectData.name.trim() },
                city: { [Op.iLike]: projectData.city.trim() },
                isMarketing: projectData.isMarketing || false
            };
            if (projectData.microLocation) {
                where.microLocation = { [Op.iLike]: projectData.microLocation.trim() };
            }
            const existing = await Project.findOne({ where });
            if (existing) {
                const label = projectData.isMarketing ? "Marketing listing" : "Project";
                return res.status(400).json({
                    success: false,
                    message: `${label} "${projectData.name}" already exists in ${projectData.microLocation ? projectData.microLocation + ', ' : ''}${projectData.city}. Please use a different name or location.`
                });
            }
        }

        const newProject = await Project.create({ ...projectData, userId: req.user?.id });
        const screenLabel = newProject.isMarketing ? "Marketing Listing" : "Project";
        await logAuditAction(req, `${screenLabel} Created`, `Created ${screenLabel.toLowerCase()} "${newProject.name}" (ID: ${newProject.id})`, "Success");
        
        if (autoPostSocial) {
            (async () => {
                try {
                    const protocol = req.headers["x-forwarded-proto"] || req.protocol;
                    const host = req.get("host");
                    const baseUrl = `${protocol}://${host}`;
                    const fallbackLogoUrl = `${baseUrl}/uploads/logo.png`;

                    let firstImgUrl: string | undefined = undefined;
                    let igImgUrl: string | undefined = undefined;

                    const allCandidateUrls = [
                      ...(newProject.images || []),
                      ...(newProject.specImage ? newProject.specImage.split(',').map(u => u.trim()) : [])
                    ].filter(Boolean);

                    // Filter for image URLs (exclude .pdf, .mp4, .webm, .mov, .avi)
                    const imageCandidates = allCandidateUrls.filter(url => !url.match(/\.(pdf|mp4|webm|mov|avi)($|\?)/i));
                    if (imageCandidates.length > 0) {
                      const img = imageCandidates[0];
                      firstImgUrl = (img.startsWith("http://") || img.startsWith("https://")) 
                        ? img 
                        : `${baseUrl}${img.startsWith("/") ? "" : "/"}${img}`;
                      
                      // Auto-adjust aspect ratio for Instagram (converts outside ratio images to 1:1 square canvas)
                      igImgUrl = await ensureInstagramCompatibleImage(img, baseUrl);
                    }

                    const message = await buildSocialPostMessage(newProject);

                    // Post to Facebook
                    const fbResult = await publishToFacebook(message, firstImgUrl);
                    if (fbResult.success) {
                        await logAuditAction(req, "Social Media Post", `Auto-published "${newProject.name}" to live Facebook Page (Post ID: ${fbResult.postId})`, "Success");
                    } else {
                        await logAuditAction(req, "Social Media Post Failed", `Failed auto-publishing "${newProject.name}" to Facebook Page: ${fbResult.error}`, "Failed");
                    }

                    // Post to Instagram (use auto-adjusted image or fallback logo, with automatic retry fallback)
                    const targetIgUrl = igImgUrl || fallbackLogoUrl;
                    const igResult = await publishToInstagram(message, targetIgUrl, fallbackLogoUrl);
                    if (igResult.success) {
                        const suffix = igResult.usedFallback || targetIgUrl === fallbackLogoUrl ? " (using logo image fallback)" : "";
                        await logAuditAction(req, "Social Media Post", `Auto-published "${newProject.name}" to Instagram${suffix} (Post ID: ${igResult.postId})`, "Success");
                    } else {
                        await logAuditAction(req, "Social Media Post Failed", `Failed auto-publishing "${newProject.name}" to Instagram: ${igResult.error}`, "Failed");
                    }
                } catch (bgErr: any) {
                    console.error("Background social post error:", bgErr);
                }
            })();
        }
        
        return res.status(201).json({ success: true, data: newProject });
    } catch (error) {
        next(error);
    }
});

// PUT update project
router.put("/:id", authenticateToken, async (req, res, next) => {
    try {
        const project = await Project.findByPk(req.params.id);
        if (!project) {
            return res.status(404).json({ success: false, message: "Project not found" });
        }
        const { autoPostSocial, ...projectData } = req.body;

        // Duplicate validation: check only if name, city, or microLocation is being changed
        const newName = (projectData.name !== undefined ? (projectData.name as string) : (project.name || "")).trim();
        const newCity = (projectData.city !== undefined ? (projectData.city as string) : (project.city || "")).trim();
        const newMicro = (projectData.microLocation !== undefined ? (projectData.microLocation as string) : (project.microLocation || "")).trim();

        const currentName = (project.name || "").trim();
        const currentCity = (project.city || "").trim();
        const currentMicro = (project.microLocation || "").trim();

        const isNameChanged = newName.toLowerCase() !== currentName.toLowerCase();
        const isCityChanged = newCity.toLowerCase() !== currentCity.toLowerCase();
        const isMicroChanged = newMicro.toLowerCase() !== currentMicro.toLowerCase();

        if ((isNameChanged || isCityChanged || isMicroChanged) && newName && newCity) {
            const targetIsMarketing = projectData.isMarketing !== undefined ? Boolean(projectData.isMarketing) : project.isMarketing;
            const where: any = {
                name: { [Op.iLike]: newName },
                city: { [Op.iLike]: newCity },
                isMarketing: targetIsMarketing,
                id: { [Op.ne]: project.id }
            };
            if (newMicro) {
                where.microLocation = { [Op.iLike]: newMicro };
            }
            const existing = await Project.findOne({ where });
            if (existing) {
                const label = targetIsMarketing ? "Marketing listing" : "Project";
                return res.status(400).json({
                    success: false,
                    message: `${label} "${newName}" already exists in ${newMicro ? newMicro + ', ' : ''}${newCity}. Please use a different name or location.`
                });
            }
        }

        await project.update(projectData);
        const screenLabel = project.isMarketing ? "Marketing Listing" : "Project";
        await logAuditAction(req, `${screenLabel} Updated`, `Updated ${screenLabel.toLowerCase()} "${project.name}" (ID: ${project.id})`, "Success");
        
        if (autoPostSocial) {
            (async () => {
                try {
                    const protocol = req.headers["x-forwarded-proto"] || req.protocol;
                    const host = req.get("host");
                    const baseUrl = `${protocol}://${host}`;
                    const fallbackLogoUrl = `${baseUrl}/uploads/logo.png`;

                    let firstImgUrl: string | undefined = undefined;
                    let igImgUrl: string | undefined = undefined;

                    const allCandidateUrls = [
                      ...(project.images || []),
                      ...(project.specImage ? project.specImage.split(',').map(u => u.trim()) : [])
                    ].filter(Boolean);

                    // Filter for image URLs (exclude .pdf, .mp4, .webm, .mov, .avi)
                    const imageCandidates = allCandidateUrls.filter(url => !url.match(/\.(pdf|mp4|webm|mov|avi)($|\?)/i));
                    if (imageCandidates.length > 0) {
                      const img = imageCandidates[0];
                      firstImgUrl = (img.startsWith("http://") || img.startsWith("https://")) 
                        ? img 
                        : `${baseUrl}${img.startsWith("/") ? "" : "/"}${img}`;
                      
                      // Auto-adjust aspect ratio for Instagram (converts outside ratio images to 1:1 square canvas)
                      igImgUrl = await ensureInstagramCompatibleImage(img, baseUrl);
                    }

                    const message = await buildSocialPostMessage(project);

                    // Post to Facebook
                    const fbResult = await publishToFacebook(message, firstImgUrl);
                    if (fbResult.success) {
                        await logAuditAction(req, "Social Media Post", `Auto-published update of "${project.name}" to live Facebook Page (Post ID: ${fbResult.postId})`, "Success");
                    } else {
                        await logAuditAction(req, "Social Media Post Failed", `Failed auto-publishing update of "${project.name}" to Facebook Page: ${fbResult.error}`, "Failed");
                    }

                    // Post to Instagram (use auto-adjusted image or fallback logo, with automatic retry fallback)
                    const targetIgUrl = igImgUrl || fallbackLogoUrl;
                    const igResult = await publishToInstagram(message, targetIgUrl, fallbackLogoUrl);
                    if (igResult.success) {
                        const suffix = igResult.usedFallback || targetIgUrl === fallbackLogoUrl ? " (using logo image fallback)" : "";
                        await logAuditAction(req, "Social Media Post", `Auto-published update of "${project.name}" to Instagram${suffix} (Post ID: ${igResult.postId})`, "Success");
                    } else {
                        await logAuditAction(req, "Social Media Post Failed", `Failed auto-publishing update of "${project.name}" to Instagram: ${igResult.error}`, "Failed");
                    }
                } catch (bgErr: any) {
                    console.error("Background social post error:", bgErr);
                }
            })();
        }
        
        return res.json({ success: true, data: project });
    } catch (error) {
        next(error);
    }
});

// DELETE project
router.delete("/:id", authenticateToken, async (req, res, next) => {
    try {
        const project = await Project.findByPk(req.params.id);
        if (!project) {
            return res.status(404).json({ success: false, message: "Project not found" });
        }
        const name = project.name;
        const id = project.id;
        const screenLabel = project.isMarketing ? "Marketing Listing" : "Project";
        await project.destroy();
        await logAuditAction(req, `${screenLabel} Deleted`, `Deleted ${screenLabel.toLowerCase()} "${name}" (ID: ${id})`, "Success");
        return res.json({ success: true, message: "Project deleted successfully" });
    } catch (error) {
        next(error);
    }
});

export default router;
