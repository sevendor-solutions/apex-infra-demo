import { Router } from "express";
import { Project } from "../models/Project";
import { authenticateToken } from "../middleware/auth";
import { logAuditAction } from "../utils/auditLogger";
import { publishToFacebook } from "../utils/facebook";

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
        const newProject = await Project.create(projectData);
        const screenLabel = newProject.isMarketing ? "Marketing Listing" : "Project";
        await logAuditAction(req, `${screenLabel} Created`, `Created ${screenLabel.toLowerCase()} "${newProject.name}" (ID: ${newProject.id})`, "Success");
        
        if (autoPostSocial) {
            const firstImg = newProject.images && newProject.images.length > 0 ? newProject.images[0] : undefined;
            const hashtagsList = `#RealEstate #Housing #JKFutureInfra #Trending #Investment #${newProject.city?.replace(/\s+/g, '') || 'Property'} #${newProject.category || 'Luxury'}`;
            const message = `🏢 New Venture Alert: ${newProject.name}\n📍 Location: ${newProject.location}, ${newProject.city}\n💰 Price Range: ${newProject.priceRange}\n\n${newProject.description || ''}\n\n${hashtagsList}`;
            
            const fbResult = await publishToFacebook(message, firstImg);
            if (fbResult.success) {
                await logAuditAction(req, "Social Media Post", `Auto-published "${newProject.name}" to live Facebook Page (Post ID: ${fbResult.postId})`, "Success");
            } else {
                await logAuditAction(req, "Social Media Post Failed", `Failed auto-publishing "${newProject.name}" to Facebook Page: ${fbResult.error}`, "Failed");
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
        await project.update(projectData);
        const screenLabel = project.isMarketing ? "Marketing Listing" : "Project";
        await logAuditAction(req, `${screenLabel} Updated`, `Updated ${screenLabel.toLowerCase()} "${project.name}" (ID: ${project.id})`, "Success");
        
        if (autoPostSocial) {
            const firstImg = project.images && project.images.length > 0 ? project.images[0] : undefined;
            const hashtagsList = `#RealEstate #Housing #JKFutureInfra #Trending #Investment #${project.city?.replace(/\s+/g, '') || 'Property'} #${project.category || 'Luxury'}`;
            const message = `🏢 New Venture Alert: ${project.name}\n📍 Location: ${project.location}, ${project.city}\n💰 Price Range: ${project.priceRange}\n\n${project.description || ''}\n\n${hashtagsList}`;
            
            const fbResult = await publishToFacebook(message, firstImg);
            if (fbResult.success) {
                await logAuditAction(req, "Social Media Post", `Auto-published update of "${project.name}" to live Facebook Page (Post ID: ${fbResult.postId})`, "Success");
            } else {
                await logAuditAction(req, "Social Media Post Failed", `Failed auto-publishing update of "${project.name}" to Facebook Page: ${fbResult.error}`, "Failed");
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
