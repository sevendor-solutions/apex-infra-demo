import { Router } from "express";
import { Quotation } from "../models/Quotation";
import { authenticateToken } from "../middleware/auth";
import { logAuditAction } from "../utils/auditLogger";

const router = Router();

// GET all quotations
router.get("/", authenticateToken, async (req, res, next) => {
    try {
        const quotations = await Quotation.findAll({ order: [["date", "DESC"], ["createdAt", "DESC"]] });
        return res.json({ success: true, data: quotations });
    } catch (error) {
        next(error);
    }
});

// POST create quotation
router.post("/", authenticateToken, async (req, res, next) => {
    try {
        const { customerName, customerMobile, customerAddress, date, validTillDate, items, totalAmount, notes, termsAndConditions, projectName } = req.body;

        if (!customerName || !customerMobile || !date || !validTillDate || !items) {
            return res.status(400).json({ success: false, message: "Required fields missing" });
        }

        // Auto-generate quotation number
        const count = await Quotation.count();
        const quotationNumber = `QT-${Date.now().toString().slice(-4)}-${count + 1}`;

        const quotation = await Quotation.create({
            quotationNumber,
            customerName,
            customerMobile,
            customerAddress,
            date,
            validTillDate,
            items,
            totalAmount: totalAmount || 0,
            notes,
            termsAndConditions,
            status: "Draft",
            projectName,
            userId: req.user?.id
        });

        await logAuditAction(req, "Create Quotation", `Created quotation: ${quotationNumber} for ${customerName}`, "Success", { quotationId: quotation.id });
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

        const { customerName, customerMobile, customerAddress, date, validTillDate, items, totalAmount, notes, termsAndConditions, status, projectName } = req.body;

        if (customerName) quotation.customerName = customerName;
        if (customerMobile) quotation.customerMobile = customerMobile;
        if (customerAddress) quotation.customerAddress = customerAddress;
        if (date) quotation.date = date;
        if (validTillDate) quotation.validTillDate = validTillDate;
        if (items) quotation.items = items;
        if (totalAmount !== undefined) quotation.totalAmount = totalAmount;
        if (notes !== undefined) quotation.notes = notes;
        if (termsAndConditions !== undefined) quotation.termsAndConditions = termsAndConditions;
        if (status) quotation.status = status;
        if (projectName !== undefined) quotation.projectName = projectName;

        await quotation.save();
        await logAuditAction(req, "Update Quotation", `Updated quotation: ${quotation.quotationNumber}`, "Success", { quotationId: quotation.id });
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
        await logAuditAction(req, "Delete Quotation", `Deleted quotation: ${quotation.quotationNumber}`, "Success", { quotationId: quotation.id });
        return res.json({ success: true, message: "Quotation deleted successfully" });
    } catch (error) {
        next(error);
    }
});

export default router;
