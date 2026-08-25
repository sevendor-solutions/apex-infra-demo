import { Router } from "express";
import { ProjectInspection } from "../models/ProjectInspection";
import { authenticateToken } from "../middleware/auth";
import { logAuditAction } from "../utils/auditLogger";

const router = Router();

// GET all project inspection records
router.get("/", authenticateToken, async (req, res, next) => {
    try {
        const records = await ProjectInspection.findAll({
            order: [["updatedAt", "DESC"], ["createdAt", "DESC"]]
        });
        return res.json({ success: true, data: records });
    } catch (error) {
        next(error);
    }
});

// GET single project inspection by project ID
router.get("/project/:projectId", authenticateToken, async (req, res, next) => {
    try {
        const record = await ProjectInspection.findOne({
            where: { projectId: req.params.projectId }
        });
        return res.json({ success: true, data: record });
    } catch (error) {
        next(error);
    }
});

// POST save or upsert inspection record
router.post("/", authenticateToken, async (req, res, next) => {
    try {
        const { id, projectId, projectName, builderName, stages, overallProgress } = req.body;
        if (!projectId || !projectName) {
            return res.status(400).json({ success: false, message: "Project ID and Project Name are required" });
        }

        let record = id ? await ProjectInspection.findByPk(id) : null;
        if (!record) {
            record = await ProjectInspection.findOne({ where: { projectId } });
        }

        if (record) {
            if (projectName) record.projectName = projectName;
            if (builderName !== undefined) record.builderName = builderName;
            if (stages !== undefined) record.stages = stages;
            if (overallProgress !== undefined) record.overallProgress = overallProgress;
            await record.save();
            await logAuditAction(req, "Update Project Inspection", `Updated stage inspection for: ${record.projectName}`, "Success", { inspectionId: record.id });
            return res.json({ success: true, data: record });
        } else {
            const created = await ProjectInspection.create({
                id: id || ("insp_" + projectId),
                projectId,
                projectName,
                builderName: builderName || "JK Future Infra",
                stages: stages || [],
                overallProgress: overallProgress || 0
            });
            await logAuditAction(req, "Create Project Inspection", `Created stage inspection for: ${created.projectName}`, "Success", { inspectionId: created.id });
            return res.status(201).json({ success: true, data: created });
        }
    } catch (error) {
        next(error);
    }
});

// DELETE inspection record
router.delete("/:id", authenticateToken, async (req, res, next) => {
    try {
        const record = await ProjectInspection.findByPk(req.params.id);
        if (!record) {
            return res.status(404).json({ success: false, message: "Inspection record not found" });
        }

        const name = record.projectName;
        await record.destroy();
        await logAuditAction(req, "Delete Project Inspection", `Deleted stage inspection for: ${name}`, "Success", { inspectionId: req.params.id });
        return res.json({ success: true, message: "Inspection record deleted successfully" });
    } catch (error) {
        next(error);
    }
});

export default router;
