import { AuthRequest } from "../middleware/auth";
import { AuditLog } from "../models/AuditLog";

export const logAuditAction = async (
    req: AuthRequest | null,
    action: string,
    details: string,
    status: "Success" | "Warning" | "Failed" = "Success",
    fallbackUser?: { username: string; role: string } | any
) => {
    try {
        const username = req?.user?.username || fallbackUser?.username || "System/Guest";
        const role = req?.user?.role || fallbackUser?.role || "Guest";
        const userId = req?.user?.id || fallbackUser?.id || null;
        
        let ip = "127.0.0.1";
        if (req) {
            (req as any)._auditLogged = true;
            ip = req.ip || 
                 (req.headers["x-forwarded-for"] as string) || 
                 req.socket.remoteAddress || 
                 "127.0.0.1";
        }
        
        await AuditLog.create({
            user: username,
            role: role,
            action: action,
            details: details,
            ip: typeof ip === "string" ? ip : String(ip),
            status: status,
            userId: userId
        });
        
        console.log(`[AUDIT LOG] ${action} - User: ${username} (ID: ${userId}) - Status: ${status} - Details: ${details}`);
    } catch (err) {
        console.error("❌ Failed to write system audit log:", err);
    }
};
