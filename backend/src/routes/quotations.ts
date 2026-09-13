import { Router } from "express";
import { Quotation } from "../models/Quotation";
import { authenticateToken } from "../middleware/auth";
import { logAuditAction } from "../utils/auditLogger";
import { runSchemaMigrations } from "../utils/schemaMigration";
import { logAccountingActivity } from "../utils/accountingLogger";

const router = Router();

// GET all quotations
router.get("/", authenticateToken, async (req, res, next) => {
    try {
        const quotations = await Quotation.findAll({ order: [["date", "DESC"], ["createdAt", "DESC"]] });
        return res.json({ success: true, data: quotations });
    } catch (error: any) {
        if (error?.message?.includes("does not exist") || error?.parent?.message?.includes("does not exist")) {
            console.warn("⚠️ Missing column detected on quotations query, auto-healing schema...");
            try {
                await runSchemaMigrations(true);
                const retryQuotations = await Quotation.findAll({ order: [["date", "DESC"], ["createdAt", "DESC"]] });
                return res.json({ success: true, data: retryQuotations });
            } catch (retryErr) {
                return next(retryErr);
            }
        }
        next(error);
    }
});

// POST create quotation
router.post("/", authenticateToken, async (req, res, next) => {
    try {
        const { customerName, customerMobile, customerAddress, date, validTillDate, items, amenityItems, totalAmount, notes, termsAndConditions, projectName } = req.body;

        if (!customerName || !customerMobile || !date || !validTillDate || !items) {
            return res.status(400).json({ success: false, message: "Required fields missing" });
        }

        // Auto-generate quotation number with QT-JKFI prefix
        const count = await Quotation.count();
        const quotationNumber = req.body.quotationNumber || `QT-JKFI-${String(1001 + count).padStart(4, '0')}`;

        const quotation = await Quotation.create({
            quotationNumber,
            customerName,
            customerMobile,
            customerAddress,
            date,
            validTillDate,
            items,
            amenityItems,
            totalAmount: totalAmount || 0,
            notes,
            termsAndConditions,
            status: "Draft",
            projectName,
            userId: req.user?.id
        });

        await logAccountingActivity({
            req,
            module: "Quotations",
            activityType: "INSERT",
            recordId: quotationNumber,
            amount: totalAmount || 0,
            description: `Created Quotation #${quotationNumber} for Customer: ${customerName} (Total: ₹${totalAmount || 0})`
        });
        return res.status(201).json({ success: true, data: quotation });
    } catch (error) {
        next(error);
    }
});

// PUT update quotation
router.put("/:id", authenticateToken, async (req, res, next) => {
    try {
        const quotation = await Quotation.findByPk(req.params.id);
        if (!quotation) return res.status(404).json({ success: false, message: "Quotation not found" });

        const { customerName, customerMobile, customerAddress, date, validTillDate, items, amenityItems, totalAmount, notes, termsAndConditions, status, projectName } = req.body;

        if (customerName) quotation.customerName = customerName;
        if (customerMobile) quotation.customerMobile = customerMobile;
        if (customerAddress !== undefined) quotation.customerAddress = customerAddress;
        if (date) quotation.date = date;
        if (validTillDate) quotation.validTillDate = validTillDate;
        if (items) quotation.items = items;
        if (amenityItems !== undefined) quotation.amenityItems = amenityItems;
        if (totalAmount !== undefined) quotation.totalAmount = totalAmount;
        if (notes !== undefined) quotation.notes = notes;
        if (termsAndConditions !== undefined) quotation.termsAndConditions = termsAndConditions;
        if (status) quotation.status = status;
        if (projectName !== undefined) quotation.projectName = projectName;

        await quotation.save();
        await logAccountingActivity({
            req,
            module: "Quotations",
            activityType: "UPDATE",
            recordId: quotation.quotationNumber,
            amount: quotation.totalAmount,
            description: `Updated Quotation #${quotation.quotationNumber} (Status: ${quotation.status}, Total: ₹${quotation.totalAmount})`
        });
        return res.json({ success: true, data: quotation });
    } catch (error) {
        next(error);
    }
});

// DELETE quotation
router.delete("/:id", authenticateToken, async (req, res, next) => {
    try {
        const quotation = await Quotation.findByPk(req.params.id);
        if (!quotation) return res.status(404).json({ success: false, message: "Quotation not found" });

        await quotation.destroy();
        await logAccountingActivity({
            req,
            module: "Quotations",
            activityType: "DELETE",
            recordId: quotation.quotationNumber,
            amount: quotation.totalAmount,
            description: `Deleted Quotation #${quotation.quotationNumber} (Customer: ${quotation.customerName}, Total: ₹${quotation.totalAmount})`
        });
        return res.json({ success: true, message: "Quotation deleted successfully" });
    } catch (error) {
        next(error);
    }
});

export default router;
