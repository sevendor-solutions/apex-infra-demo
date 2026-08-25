import { Router } from "express";
import { CostAnalysis } from "../models/CostAnalysis";
import { authenticateToken } from "../middleware/auth";
import { logAuditAction } from "../utils/auditLogger";

const router = Router();

// GET all cost analysis sheets
router.get("/", authenticateToken, async (req, res, next) => {
    try {
        const analyses = await CostAnalysis.findAll({
            order: [["updatedAt", "DESC"], ["createdAt", "DESC"]]
        });
        return res.json({ success: true, data: analyses });
    } catch (error) {
        next(error);
    }
});

// GET single cost analysis by ID
router.get("/:id", authenticateToken, async (req, res, next) => {
    try {
        const analysis = await CostAnalysis.findByPk(req.params.id);
        if (!analysis) {
            return res.status(404).json({ success: false, message: "Cost analysis sheet not found" });
        }
        return res.json({ success: true, data: analysis });
    } catch (error) {
        next(error);
    }
});

// POST create or upsert cost analysis sheet
router.post("/", authenticateToken, async (req, res, next) => {
    try {
        const data = req.body;
        if (!data.projectName || !data.projectName.trim()) {
            return res.status(400).json({ success: false, message: "Project Name is required" });
        }

        let analysis: CostAnalysis | null = null;
        if (data.id) {
            analysis = await CostAnalysis.findByPk(data.id);
        }
        if (!analysis && data.projectId) {
            analysis = await CostAnalysis.findOne({ where: { projectId: data.projectId } });
        }

        if (analysis) {
            // Update existing record
            await analysis.update(data);
            await logAuditAction(req, "Update Cost Analysis", `Updated cost analysis for project: ${analysis.projectName}`, "Success", { sheetId: analysis.id });
            return res.json({ success: true, data: analysis });
        } else {
            // Create new record
            const created = await CostAnalysis.create({
                ...data,
                id: data.id || ('cost_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6))
            });
            await logAuditAction(req, "Create Cost Analysis", `Created cost analysis for project: ${created.projectName}`, "Success", { sheetId: created.id });
            return res.status(201).json({ success: true, data: created });
        }
    } catch (error) {
        next(error);
    }
});

// PUT update cost analysis sheet
router.put("/:id", authenticateToken, async (req, res, next) => {
    try {
        const analysis = await CostAnalysis.findByPk(req.params.id);
        if (!analysis) {
            return res.status(404).json({ success: false, message: "Cost analysis sheet not found" });
        }

        await analysis.update(req.body);
        await logAuditAction(req, "Update Cost Analysis", `Updated cost analysis for project: ${analysis.projectName}`, "Success", { sheetId: analysis.id });
        return res.json({ success: true, data: analysis });
    } catch (error) {
        next(error);
    }
});

// DELETE cost analysis sheet
router.delete("/:id", authenticateToken, async (req, res, next) => {
    try {
        const analysis = await CostAnalysis.findByPk(req.params.id);
        if (!analysis) {
            return res.status(404).json({ success: false, message: "Cost analysis sheet not found" });
        }

        const name = analysis.projectName;
        await analysis.destroy();
        await logAuditAction(req, "Delete Cost Analysis", `Deleted cost analysis sheet for project: ${name}`, "Success", { sheetId: req.params.id });
        return res.json({ success: true, message: "Cost analysis sheet deleted successfully" });
    } catch (error) {
        next(error);
    }
});

export default router;
