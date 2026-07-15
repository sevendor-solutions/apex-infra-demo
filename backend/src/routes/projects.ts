import { Router } from "express";
import { Op } from "sequelize";
import { Project } from "../models/Project";
import { authenticateToken } from "../middleware/auth";
import { logAuditAction } from "../utils/auditLogger";
import { publishToFacebook, publishToInstagram } from "../utils/facebook";

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
            const firstImg = newProject.images && newProject.images.length > 0 ? newProject.images[0] : undefined;
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

            const cityHash = newProject.city ? `#${newProject.city.replace(/\s+/g, '')}` : '';
            const microHash = newProject.microLocation ? `#${newProject.microLocation.replace(/\s+/g, '')}` : '';
            const hashtagsList = `#RealEstate #Housing #JKFutureInfra #Trending #Investment ${cityHash} ${microHash} #${newProject.category || 'Luxury'}`.replace(/\s+/g, ' ').trim();
            const locParts = [newProject.location, newProject.microLocation, newProject.city].filter(Boolean);
            const locationStr = locParts.join(", ");
            const message = `🏢 New Venture Alert: ${newProject.name}\n📍 Location: ${locationStr}\n💰 Price Range: ${newProject.priceRange}\n\n${newProject.description || ''}\n\n${hashtagsList}`;
            
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

        // Duplicate validation: same name + city + microLocation (exclude current record)
        if (projectData.name && projectData.city) {
            const where: any = {
                name: { [Op.iLike]: (projectData.name as string).trim() },
                city: { [Op.iLike]: (projectData.city as string).trim() },
                isMarketing: project.isMarketing,
                id: { [Op.ne]: project.id }
            };
            if (projectData.microLocation) {
                where.microLocation = { [Op.iLike]: (projectData.microLocation as string).trim() };
            }
            const existing = await Project.findOne({ where });
            if (existing) {
                const label = project.isMarketing ? "Marketing listing" : "Project";
                return res.status(400).json({
                    success: false,
                    message: `${label} "${projectData.name}" already exists in ${projectData.microLocation ? projectData.microLocation + ', ' : ''}${projectData.city}. Please use a different name or location.`
                });
            }
        }

        await project.update(projectData);
        const screenLabel = project.isMarketing ? "Marketing Listing" : "Project";
        await logAuditAction(req, `${screenLabel} Updated`, `Updated ${screenLabel.toLowerCase()} "${project.name}" (ID: ${project.id})`, "Success");
        
        if (autoPostSocial) {
            const firstImg = project.images && project.images.length > 0 ? project.images[0] : undefined;
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

            const cityHash = project.city ? `#${project.city.replace(/\s+/g, '')}` : '';
            const microHash = project.microLocation ? `#${project.microLocation.replace(/\s+/g, '')}` : '';
            const hashtagsList = `#RealEstate #Housing #JKFutureInfra #Trending #Investment ${cityHash} ${microHash} #${project.category || 'Luxury'}`.replace(/\s+/g, ' ').trim();
            const locParts = [project.location, project.microLocation, project.city].filter(Boolean);
            const locationStr = locParts.join(", ");
            const message = `🏢 New Venture Alert: ${project.name}\n📍 Location: ${locationStr}\n💰 Price Range: ${project.priceRange}\n\n${project.description || ''}\n\n${hashtagsList}`;
            
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
