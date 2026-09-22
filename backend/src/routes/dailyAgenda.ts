import { Router } from "express";
import { DailyAgendaMatrix } from "../models/DailyAgendaMatrix";
import { authenticateToken } from "../middleware/auth";
import { logAuditAction } from "../utils/auditLogger";

const router = Router();

// GET all saved daily agenda matrices
router.get("/", authenticateToken, async (req, res, next) => {
    try {
        const matrices = await DailyAgendaMatrix.findAll({
            order: [["updatedAt", "DESC"], ["createdAt", "DESC"]]
        });
        return res.json({ success: true, data: matrices });
    } catch (error) {
        next(error);
    }
});

// POST save or upsert matrix
router.post("/", authenticateToken, async (req, res, next) => {
    try {
        const { id, title, columns, rows, cellChecklists, taskItems } = req.body;

        const targetId = id || "matrix_default";
        let matrix = await DailyAgendaMatrix.findByPk(targetId);

        if (matrix) {
            if (title !== undefined) matrix.title = title;
            if (columns !== undefined) {
                matrix.columns = columns;
                matrix.changed("columns", true);
            }
            if (rows !== undefined) {
                matrix.rows = rows;
                matrix.changed("rows", true);
            }
            if (cellChecklists !== undefined) {
                matrix.cellChecklists = cellChecklists;
                matrix.changed("cellChecklists", true);
            }
            if (taskItems !== undefined) {
                matrix.taskItems = taskItems;
                matrix.changed("taskItems", true);
            }
            await matrix.save();
            logAuditAction(req, "Update Daily Agenda Matrix", `Updated follow-up matrix: ${matrix.title}`, "Success", { matrixId: matrix.id }).catch(err => console.error("Audit log error:", err));
            return res.json({ success: true, data: matrix });
        } else {
            const created = await DailyAgendaMatrix.create({
                id: targetId,
                title: title || "Daily Construction Follow-up Matrix",
                columns: columns || [],
                rows: rows || [],
                cellChecklists: cellChecklists || {},
                taskItems: taskItems || []
            });
            logAuditAction(req, "Create Daily Agenda Matrix", `Created follow-up matrix: ${created.title}`, "Success", { matrixId: created.id }).catch(err => console.error("Audit log error:", err));
            return res.status(201).json({ success: true, data: created });
        }
    } catch (error) {
        next(error);
    }
});

// DELETE matrix by ID
router.delete("/:id", authenticateToken, async (req, res, next) => {
    try {
        const matrix = await DailyAgendaMatrix.findByPk(req.params.id);
        if (!matrix) {
            return res.status(404).json({ success: false, message: "Matrix not found" });
        }

        const title = matrix.title;
        await matrix.destroy();
        await logAuditAction(req, "Delete Daily Agenda Matrix", `Deleted follow-up matrix: ${title}`, "Success", { matrixId: req.params.id });
        return res.json({ success: true, message: "Matrix deleted successfully" });
    } catch (error) {
        next(error);
    }
});

export default router;
