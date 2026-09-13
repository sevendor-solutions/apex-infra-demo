import { AuthRequest } from "../middleware/auth";
import { AccountingActivity } from "../models/AccountingActivity";
import { logAuditAction } from "./auditLogger";

export interface LogAccountingParams {
    req: AuthRequest | null | any;
    module: string;
    activityType: "INSERT" | "UPDATE" | "DELETE";
    recordId?: string;
    description: string;
    amount?: number;
    metadata?: any;
    fallbackUser?: { username: string; role: string; id?: string };
}

export const logAccountingActivity = async ({
    req,
    module,
    activityType,
    recordId,
    description,
    amount,
    metadata,
    fallbackUser
}: LogAccountingParams) => {
    try {
        const username = req?.user?.username || fallbackUser?.username || "Admin";
        const role = req?.user?.role || fallbackUser?.role || "Admin";
        const userId = req?.user?.id || fallbackUser?.id || null;

        let ip = "127.0.0.1";
        if (req) {
            (req as any)._accountingActivityLogged = true;
            ip = req.ip ||
                (req.headers && (req.headers["x-forwarded-for"] as string)) ||
                (req.socket && req.socket.remoteAddress) ||
                "127.0.0.1";
        }

        const serializedMetadata = metadata ? (typeof metadata === "string" ? metadata : JSON.stringify(metadata)) : null;

        await AccountingActivity.create({
            module,
            activityType,
            recordId: recordId || null,
            description,
            amount: amount !== undefined ? parseFloat(String(amount)) : 0,
            userName: username,
            userRole: role,
            userId,
            ipAddress: typeof ip === "string" ? ip : String(ip),
            dateTime: new Date(),
            metadata: serializedMetadata
        });

        console.log(`[ACCOUNTING LOG] [${activityType}] ${module} - Record: ${recordId || "N/A"} - User: ${username} - Amount: ₹${amount || 0}`);

        // Keep system general audit logs synchronized as well
        await logAuditAction(req, `${activityType} ${module}`, description, "Success", fallbackUser);
    } catch (err) {
        console.error("❌ Failed to log accounting activity:", err);
    }
};
