import { Request, Response, NextFunction } from "express";
import { logAccountingActivity } from "../utils/accountingLogger";

const IGNORED_PATHS = [
    "/api/auth/ping",
    "/api/auth/verify-token",
    "/api/audit-logs",
    "/api/accounting-activities",
    "/uploads"
];

function getModuleName(req: Request): string {
    const url = req.originalUrl.toLowerCase().split("?")[0];

    if (url.includes("/api/projects")) {
        return (req.body?.isMarketing || req.query?.isMarketing === "true") ? "Marketing Properties" : "Projects";
    }
    if (url.includes("/api/blogs")) return "Blogs";
    if (url.includes("/api/gallery")) return "Gallery";
    if (url.includes("/api/documents")) return "Documents";
    if (url.includes("/api/enquiries")) return "Enquiries";
    if (url.includes("/api/careers")) return "Careers";
    if (url.includes("/api/masters/cities")) return "Masters: Cities";
    if (url.includes("/api/masters/facings")) return "Masters: Facings";
    if (url.includes("/api/masters/property-types")) return "Masters: Property Types";
    if (url.includes("/api/masters/amenities")) return "Masters: Amenities";
    if (url.includes("/api/masters/locations")) return "Masters: Locations";
    if (url.includes("/api/site-visits")) return "Site Visits";
    if (url.includes("/api/mail-config")) return "Mail Config";
    if (url.includes("/api/marketing-agents")) return "Marketing Agents";
    if (url.includes("/api/users")) return "Users";
    if (url.includes("/api/cost-analyses")) return "Cost Analysis";
    if (url.includes("/api/daily-agenda")) return "Daily Agenda Matrix";
    if (url.includes("/api/project-inspections")) return "Project Inspections";
    if (url.includes("/api/invoices")) return "Invoices";
    if (url.includes("/api/payments/in")) return "Payment-In";
    if (url.includes("/api/payments/out")) return "Payment-Out";
    if (url.includes("/api/payments")) return "Payments";
    if (url.includes("/api/expenses")) return "Expenses";
    if (url.includes("/api/expense-categories")) return "Expense Categories";
    if (url.includes("/api/wallets")) return "Wallets";
    if (url.includes("/api/quotations")) return "Quotations";
    if (url.includes("/api/inventory")) return "Inventory";
    if (url.includes("/api/loans")) return "Loans";
    if (url.includes("/api/customers")) return "Customers";
    if (url.includes("/api/suppliers")) return "Suppliers";

    const parts = url.replace("/api/", "").split("/");
    const firstPart = parts[0] || "General";
    return firstPart.charAt(0).toUpperCase() + firstPart.slice(1);
}

export const globalAuditMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const method = req.method.toUpperCase();

    // Only audit mutating write actions: POST, PUT, PATCH, DELETE
    if (!["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
        return next();
    }

    const path = req.originalUrl.toLowerCase().split("?")[0];
    if (IGNORED_PATHS.some((ignored) => path.startsWith(ignored))) {
        return next();
    }

    res.on("finish", async () => {
        try {
            // Only log successful operations
            if (res.statusCode < 200 || res.statusCode >= 400) {
                return;
            }

            // If an explicit route logger already logged this request, avoid duplicate
            if ((req as any)._accountingActivityLogged) {
                return;
            }

            const module = getModuleName(req);

            let activityType: "INSERT" | "UPDATE" | "DELETE" = "INSERT";
            if (method === "PUT" || method === "PATCH") activityType = "UPDATE";
            else if (method === "DELETE") activityType = "DELETE";

            const recordId =
                req.params.id ||
                req.body?.id ||
                req.body?.code ||
                req.body?.name ||
                req.body?.title ||
                req.body?.username ||
                req.body?.invoiceNumber ||
                req.body?.quotationNumber ||
                req.body?.expenseNo ||
                req.body?.receiptNo ||
                req.originalUrl.split("/").filter(Boolean).pop() ||
                null;

            const nameOrTitle = req.body?.name || req.body?.title || req.body?.username || req.body?.party || "";
            const amount = req.body?.amount || req.body?.totalAmount || 0;

            const actionVerb = activityType === "INSERT" ? "Created" : activityType === "UPDATE" ? "Updated" : "Deleted";
            const itemDesc = nameOrTitle ? ` "${nameOrTitle}"` : (recordId ? ` #${recordId}` : "");
            const description = `${actionVerb} ${module}${itemDesc}`;

            await logAccountingActivity({
                req,
                module,
                activityType,
                recordId: recordId ? String(recordId) : undefined,
                amount: typeof amount === "number" ? amount : parseFloat(String(amount)) || 0,
                description,
                metadata: {
                    url: req.originalUrl,
                    method: req.method,
                    statusCode: res.statusCode
                }
            });
        } catch (err) {
            console.error("⚠️ Global Audit Middleware error:", err);
        }
    });

    next();
};
