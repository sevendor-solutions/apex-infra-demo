import { Router } from "express";
import { JobApplication } from "../models/JobApplication";
import { authenticateToken } from "../middleware/auth";

const router = Router();

// GET all job applications
router.get("/applications", authenticateToken, async (req, res, next) => {
    try {
        const applications = await JobApplication.findAll({
            order: [["date", "DESC"]]
        });
        return res.json({ success: true, data: applications });
    } catch (error) {
        next(error);
    }
});

// POST submit a job application
router.post("/apply", async (req, res, next) => {
    try {
        const newApplication = await JobApplication.create(req.body);
        return res.status(201).json({ success: true, data: newApplication });
    } catch (error) {
        next(error);
    }
});

// PUT update job application status
router.put("/applications/:id", authenticateToken, async (req, res, next) => {
    try {
        const application = await JobApplication.findByPk(req.params.id);
        if (!application) {
            return res.status(404).json({ success: false, message: "Application not found" });
        }
        await application.update(req.body);
        return res.json({ success: true, data: application });
    } catch (error) {
        next(error);
    }
});

// DELETE job application
router.delete("/applications/:id", authenticateToken, async (req, res, next) => {
    try {
        const application = await JobApplication.findByPk(req.params.id);
        if (!application) {
            return res.status(404).json({ success: false, message: "Application not found" });
        }
        await application.destroy();
        return res.json({ success: true, message: "Application deleted successfully" });
    } catch (error) {
        next(error);
    }
});

export default router;
