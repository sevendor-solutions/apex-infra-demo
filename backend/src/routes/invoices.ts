import { Router } from "express";
import { Invoice } from "../models/Invoice";
import { Customer } from "../models/Customer";
import { InventoryItem } from "../models/InventoryItem";
import { StockMovement } from "../models/StockMovement";
import { authenticateToken } from "../middleware/auth";
import { logAuditAction } from "../utils/auditLogger";

const router = Router();

// GET all invoices
router.get("/", authenticateToken, async (req, res, next) => {
    try {
        const invoices = await Invoice.findAll({ order: [["date", "DESC"], ["createdAt", "DESC"]] });
        return res.json({ success: true, data: invoices });
    } catch (error) {
        next(error);
    }
});

// POST create invoice (automatically reduces stock & increases customer outstanding balance)
router.post("/", authenticateToken, async (req, res, next) => {
    try {
        const { customerName, date, items, totalAmount, gstAmount, discountAmount, paidAmount } = req.body;

        if (!customerName || !date || !items || items.length === 0) {
            return res.status(400).json({ success: false, message: "Required fields missing" });
        }

        // Auto-generate invoice number
        const count = await Invoice.count();
        const invoiceNumber = `INV-${Date.now().toString().slice(-4)}-${count + 1}`;

        const total = parseFloat(totalAmount || 0);
        const paid = parseFloat(paidAmount || 0);
        const pending = total - paid;
        let paymentStatus = "Unpaid";
        if (paid >= total) paymentStatus = "Paid";
        else if (paid > 0) paymentStatus = "Partial";

        const invoice = await Invoice.create({
            invoiceNumber,
            customerName,
            date,
            items,
            totalAmount: total,
            gstAmount: parseFloat(gstAmount || 0),
            discountAmount: parseFloat(discountAmount || 0),
            paidAmount: paid,
            pendingAmount: pending,
            paymentStatus,
            userId: req.user?.id
        });

        // 1. Update Customer Outstanding Balance
        const customer = await Customer.findOne({ where: { name: customerName } });
        if (customer) {
            customer.outstandingAmount += pending;
            await customer.save();
        }

        // 2. Reduce Stock & Create Stock Movements
        for (const item of items) {
            const product = await InventoryItem.findOne({ where: { code: item.productCode } });
            if (product) {
                product.currentStock -= parseFloat(item.quantity);
                await product.save();

                await StockMovement.create({
                    productCode: item.productCode,
                    type: "Stock Out",
                    quantity: parseFloat(item.quantity),
                    date,
                    notes: `Sales Invoice reference: ${invoiceNumber}`,
                    userId: req.user?.id
                });
            }
        }

        await logAuditAction(req, "Create Invoice", `Generated invoice: ${invoiceNumber} for ${customerName}`, "Success", { invoiceId: invoice.id });
        return res.status(201).json({ success: true, data: invoice });
    } catch (error) {
        next(error);
    }
});

// DELETE invoice
router.delete("/:id", authenticateToken, async (req, res, next) => {
    try {
        const invoice = await Invoice.findByPk(req.params.id);
        if (!invoice) return res.status(404).json({ success: false, message: "Invoice not found" });

        // Reverse stock reductions
        for (const item of invoice.items) {
            const product = await InventoryItem.findOne({ where: { code: item.productCode } });
            if (product) {
                product.currentStock += parseFloat(item.quantity as any);
                await product.save();
            }
        }

        // Reverse customer outstanding amount
        const customer = await Customer.findOne({ where: { name: invoice.customerName } });
        if (customer) {
            customer.outstandingAmount -= invoice.pendingAmount;
            if (customer.outstandingAmount < 0) customer.outstandingAmount = 0;
            await customer.save();
        }

        await invoice.destroy();
        await logAuditAction(req, "Delete Invoice", `Deleted invoice: ${invoice.invoiceNumber}`, "Success", { invoiceId: invoice.id });
        return res.json({ success: true, message: "Invoice deleted successfully" });
    } catch (error) {
        next(error);
    }
});

export default router;
