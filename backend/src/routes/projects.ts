import { Router } from "express";
import { Op } from "sequelize";
import { Project } from "../models/Project";
import { MarketingAgent } from "../models/MarketingAgent";
import { authenticateToken } from "../middleware/auth";
import { logAuditAction } from "../utils/auditLogger";
import { publishToFacebook, publishToInstagram } from "../utils/facebook";

async function buildSocialPostMessage(project: any): Promise<string> {
    const locParts = [project.location, project.microLocation, project.city].filter(Boolean);
    const locationStr = locParts.join(", ");
    const cityHash = project.city ? `#${project.city.replace(/\s+/g, '')}` : '';
    const microHash = project.microLocation ? `#${project.microLocation.replace(/\s+/g, '')}` : '';
    const categoryHash = project.category ? `#${project.category.replace(/\s+/g, '')}` : '';
    const hashtagsList = `#RealEstate #Housing #JKFutureInfra #Trending #Investment ${cityHash} ${microHash} ${categoryHash} #LuxuryLiving #DreamHome`.replace(/\s+/g, ' ').trim();

    const websiteUrl = "https://jkfutureinfra.com";

    if (project.isMarketing) {
        let agent: MarketingAgent | null = null;
        if (project.agentId) {
            agent = await MarketingAgent.findByPk(project.agentId);
        }

        const agentNameStr = agent?.name ? `👤 Marketing Agent: ${agent.name}\n` : '';
        const agentPhoneStr = agent?.phone 
            ? `📞 Call / WhatsApp Agent: ${agent.phone}\n` 
            : `📞 Call / WhatsApp: +91 9000553832, +91 7893963322\n`;

        return `✨ FEATURED PROPERTY SHOWCASE ✨\n\n🏢 Property: ${project.name}\n🏷️ Segment: ${project.category || 'Real Estate'}\n📍 Location: ${locationStr}\n💰 Investment: ${project.priceRange || 'Contact for Price'}\n\n📝 Description:\n${project.description || ''}\n\n🌐 Website: ${websiteUrl}\n${agentNameStr}${agentPhoneStr}\n${hashtagsList}`;
    } else {
        return `✨ PREMIUM REAL ESTATE OPPORTUNITY ✨\n\n🏢 Venture: ${project.name}\n🏷️ Category: ${project.category || 'Real Estate'}\n📍 Location: ${locationStr}\n💰 Price Range: ${project.priceRange || 'Contact for Price'}\n\n📝 Overview:\n${project.description || ''}\n\n🌐 Website: ${websiteUrl}\n📞 Call / WhatsApp: +91 9000553832, +91 7893963322\n\n${hashtagsList}`;
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
                    let firstImg: string | undefined = undefined;
                    if (newProject.isMarketing) {
                        firstImg = (newProject.images && newProject.images.length > 0) ? newProject.images[0] : newProject.specImage;
                    } else {
                        firstImg = newProject.specImage || ((newProject.images && newProject.images.length > 0) ? newProject.images[0] : undefined);
                    }

                    let absoluteImgUrl: string | undefined = undefined;
                    if (firstImg) {
                        if (firstImg.startsWith("http://") || firstImg.startsWith("https://")) {
                            absoluteImgUrl = firstImg;
                        } else {
                            const protocol = req.headers["x-forwarded-proto"] || req.protocol;
                            const host = req.get("host");
                            absoluteImgUrl = `${protocol}://${host}${firstImg.startsWith("/") ? "" : "/"}${firstImg}`;
                        }
                    }

                    const message = await buildSocialPostMessage(newProject);

                    // Post to Facebook
                    const fbResult = await publishToFacebook(message, absoluteImgUrl);
                    if (fbResult.success) {
                        await logAuditAction(req, "Social Media Post", `Auto-published "${newProject.name}" to live Facebook Page (Post ID: ${fbResult.postId})`, "Success");
                    } else {
                        await logAuditAction(req, "Social Media Post Failed", `Failed auto-publishing "${newProject.name}" to Facebook Page: ${fbResult.error}`, "Failed");
                    }

                    // Post to Instagram (use uploaded image, or fall back to default logo)
                    let igImgUrl = absoluteImgUrl;
                    let usingFallbackLogo = false;
                    if (!igImgUrl) {
                        const protocol = req.headers["x-forwarded-proto"] || req.protocol;
                        const host = req.get("host");
                        igImgUrl = `${protocol}://${host}/uploads/logo.png`;
                        usingFallbackLogo = true;
                    }

                    const igResult = await publishToInstagram(message, igImgUrl);
                    if (igResult.success) {
                        const suffix = usingFallbackLogo ? " (using default logo)" : "";
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
                    let firstImg: string | undefined = undefined;
                    if (project.isMarketing) {
                        firstImg = (project.images && project.images.length > 0) ? project.images[0] : project.specImage;
                    } else {
                        firstImg = project.specImage || ((project.images && project.images.length > 0) ? project.images[0] : undefined);
                    }

                    let absoluteImgUrl: string | undefined = undefined;
                    if (firstImg) {
                        if (firstImg.startsWith("http://") || firstImg.startsWith("https://")) {
                            absoluteImgUrl = firstImg;
                        } else {
                            const protocol = req.headers["x-forwarded-proto"] || req.protocol;
                            const host = req.get("host");
                            absoluteImgUrl = `${protocol}://${host}${firstImg.startsWith("/") ? "" : "/"}${firstImg}`;
                        }
                    }

                    const message = await buildSocialPostMessage(project);

                    // Post to Facebook
                    const fbResult = await publishToFacebook(message, absoluteImgUrl);
                    if (fbResult.success) {
                        await logAuditAction(req, "Social Media Post", `Auto-published update of "${project.name}" to live Facebook Page (Post ID: ${fbResult.postId})`, "Success");
                    } else {
                        await logAuditAction(req, "Social Media Post Failed", `Failed auto-publishing update of "${project.name}" to Facebook Page: ${fbResult.error}`, "Failed");
                    }

                    // Post to Instagram (use uploaded image, or fall back to default logo)
                    let igImgUrl = absoluteImgUrl;
                    let usingFallbackLogo = false;
                    if (!igImgUrl) {
                        const protocol = req.headers["x-forwarded-proto"] || req.protocol;
                        const host = req.get("host");
                        igImgUrl = `${protocol}://${host}/uploads/logo.png`;
                        usingFallbackLogo = true;
                    }

                    const igResult = await publishToInstagram(message, igImgUrl);
                    if (igResult.success) {
                        const suffix = usingFallbackLogo ? " (using default logo)" : "";
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
