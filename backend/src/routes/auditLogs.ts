import { Router } from "express";
import { AuditLog } from "../models/AuditLog";
import { authenticateToken } from "../middleware/auth";
import { logAuditAction } from "../utils/auditLogger";

const router = Router();

router.use(authenticateToken);

// GET all audit logs
router.get("/", async (req, res, next) => {
    try {
        const logs = await AuditLog.findAll({
            order: [["createdAt", "DESC"]],
            limit: 1000
        });
        
        // Map backend schema to what the frontend expects
        const frontendLogs = logs.map(l => ({
            id: l.id,
            timestamp: l.createdAt.toISOString(),
            user: l.user,
            role: l.role,
            action: l.action,
            details: l.details,
            ip: l.ip || "127.0.0.1",
            status: l.status
        }));
        
        return res.json({ success: true, data: frontendLogs });
    } catch (error) {
        next(error);
    }
});

// POST create custom audit log
router.post("/", async (req, res, next) => {
    try {
        const { action, details, status } = req.body;
        await logAuditAction(req, action, details, status || "Success");
        return res.status(201).json({ success: true, message: "Audit log created successfully" });
    } catch (error) {
        next(error);
    }
});

// DELETE clear all audit logs
router.delete("/", async (req, res, next) => {
    try {
        await AuditLog.destroy({ where: {}, truncate: true });
        
        // Log the clear action
        await logAuditAction(req, "Clear Audit Logs", "Cleared system audit trail database table", "Success");
        
        return res.json({ success: true, message: "Audit logs cleared successfully" });
    } catch (error) {
        next(error);
    }
});

export default router;
