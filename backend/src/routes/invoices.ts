import { Router } from "express";
import { Op } from "sequelize";
import { Invoice } from "../models/Invoice";
import { Customer } from "../models/Customer";
import { Quotation } from "../models/Quotation";
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
        const { customerName, customerMobile, customerAddress, projectName, date, items, amenityItems, totalAmount, gstAmount, discountAmount, paidAmount, termsAndConditions, notes, quotationId, quotationNumber } = req.body;

        if (!customerName || !date || !items || items.length === 0) {
            return res.status(400).json({ success: false, message: "Required fields missing" });
        }

        // Auto-generate invoice number
        const count = await Invoice.count();
        const invoiceNumber = req.body.invoiceNumber || `INV-JKFI-${String(1001 + count).padStart(4, '0')}`;

        const total = parseFloat(totalAmount || 0);
        const paid = parseFloat(paidAmount || 0);
        const pending = total - paid;
        let paymentStatus = "Unpaid";
        if (paid >= total) paymentStatus = "Paid";
        else if (paid > 0) paymentStatus = "Partial";

        const invoice = await Invoice.create({
            invoiceNumber,
            customerName,
            customerMobile,
            customerAddress,
            projectName,
            date,
            items,
            amenityItems,
            totalAmount: total,
            gstAmount: parseFloat(gstAmount || 0),
            discountAmount: parseFloat(discountAmount || 0),
            paidAmount: paid,
            pendingAmount: pending,
            paymentStatus,
            termsAndConditions,
            notes,
            quotationId,
            quotationNumber,
            userId: req.user?.id
        });

        // If linked to quotation, ensure quotation status is Converted
        if (quotationId) {
            const quotation = await Quotation.findByPk(quotationId);
            if (quotation && quotation.status !== "Converted") {
                quotation.status = "Converted";
                await quotation.save();
            }
        } else if (quotationNumber) {
            const quotation = await Quotation.findOne({ where: { quotationNumber } });
            if (quotation && quotation.status !== "Converted") {
                quotation.status = "Converted";
                await quotation.save();
            }
        }

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

// PUT update invoice
router.put("/:id", authenticateToken, async (req, res, next) => {
    try {
        const invoice = await Invoice.findByPk(req.params.id);
        if (!invoice) return res.status(404).json({ success: false, message: "Invoice not found" });

        const { customerName, customerMobile, customerAddress, projectName, date, items, amenityItems, totalAmount, gstAmount, discountAmount, paidAmount, termsAndConditions, notes } = req.body;

        if (!customerName || !date || !items || items.length === 0) {
            return res.status(400).json({ success: false, message: "Required fields missing" });
        }

        // 1. Reverse old stock reductions
        for (const item of invoice.items || []) {
            if (item.productCode) {
                const product = await InventoryItem.findOne({ where: { code: item.productCode } });
                if (product) {
                    product.currentStock += parseFloat(item.quantity as any || 0);
                    await product.save();
                }
            }
        }

        // 2. Reverse old customer outstanding amount
        const oldCustomer = await Customer.findOne({ where: { name: invoice.customerName } });
        if (oldCustomer) {
            oldCustomer.outstandingAmount -= invoice.pendingAmount;
            if (oldCustomer.outstandingAmount < 0) oldCustomer.outstandingAmount = 0;
            await oldCustomer.save();
        }

        // 3. Calculate new total, paid, pending, paymentStatus
        const total = parseFloat(totalAmount || 0);
        const paid = parseFloat(paidAmount || 0);
        const pending = total - paid;
        let paymentStatus = "Unpaid";
        if (paid >= total) paymentStatus = "Paid";
        else if (paid > 0) paymentStatus = "Partial";

        // 4. Update invoice fields
        invoice.customerName = customerName;
        invoice.customerMobile = customerMobile;
        invoice.customerAddress = customerAddress;
        invoice.projectName = projectName;
        invoice.date = date;
        invoice.items = items;
        invoice.amenityItems = amenityItems || [];
        invoice.totalAmount = total;
        invoice.gstAmount = parseFloat(gstAmount || 0);
        invoice.discountAmount = parseFloat(discountAmount || 0);
        invoice.paidAmount = paid;
        invoice.pendingAmount = pending;
        invoice.paymentStatus = paymentStatus;
        if (termsAndConditions !== undefined) invoice.termsAndConditions = termsAndConditions;
        if (notes !== undefined) invoice.notes = notes;

        await invoice.save();

        // 5. Apply new customer outstanding amount
        const newCustomer = await Customer.findOne({ where: { name: customerName } });
        if (newCustomer) {
            newCustomer.outstandingAmount += pending;
            await newCustomer.save();
        }

        // 6. Apply new stock reductions & Stock Movements
        for (const item of items) {
            if (item.productCode) {
                const product = await InventoryItem.findOne({ where: { code: item.productCode } });
                if (product) {
                    product.currentStock -= parseFloat(item.quantity || 0);
                    await product.save();

                    await StockMovement.create({
                        productCode: item.productCode,
                        type: "Stock Out",
                        quantity: parseFloat(item.quantity || 0),
                        date,
                        notes: `Sales Invoice update reference: ${invoice.invoiceNumber}`,
                        userId: req.user?.id
                    });
                }
            }
        }

        await logAuditAction(req, "Update Invoice", `Updated invoice: ${invoice.invoiceNumber} for ${customerName}`, "Success", { invoiceId: invoice.id });
        return res.json({ success: true, data: invoice });
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
        for (const item of (invoice.items || [])) {
            if (item.productCode) {
                const product = await InventoryItem.findOne({ where: { code: item.productCode } });
                if (product) {
                    product.currentStock += parseFloat(item.quantity as any || 0);
                    await product.save();
                }
            }
        }

        // Clean up stock movements created for this invoice
        try {
            await StockMovement.destroy({
                where: {
                    notes: {
                        [Op.like]: `%${invoice.invoiceNumber}%`
                    }
                }
            });
        } catch (smErr) {
            console.error("Error cleaning up stock movements for invoice:", smErr);
        }

        // Reverse customer outstanding amount
        const customer = await Customer.findOne({ where: { name: invoice.customerName } });
        if (customer) {
            customer.outstandingAmount -= invoice.pendingAmount;
            if (customer.outstandingAmount < 0) customer.outstandingAmount = 0;
            await customer.save();
        }

        // Restore linked quotation status from Converted back to Approved
        try {
            if (invoice.quotationId) {
                const quotation = await Quotation.findByPk(invoice.quotationId);
                if (quotation && quotation.status === "Converted") {
                    quotation.status = "Approved";
                    await quotation.save();
                }
            } else if (invoice.quotationNumber) {
                const quotation = await Quotation.findOne({ where: { quotationNumber: invoice.quotationNumber } });
                if (quotation && quotation.status === "Converted") {
                    quotation.status = "Approved";
                    await quotation.save();
                }
            } else {
                // Fallback: match by customer name and total amount if status is Converted
                const quotation = await Quotation.findOne({
                    where: {
                        customerName: invoice.customerName,
                        totalAmount: invoice.totalAmount,
                        status: "Converted"
                    }
                });
                if (quotation) {
                    quotation.status = "Approved";
                    await quotation.save();
                }
            }
        } catch (qErr) {
            console.error("Error reverting linked quotation status:", qErr);
        }

        await invoice.destroy();
        await logAuditAction(req, "Delete Invoice", `Deleted invoice: ${invoice.invoiceNumber}`, "Success", { invoiceId: invoice.id });
        return res.json({ success: true, message: "Invoice deleted successfully and linked quotation status restored" });
    } catch (error) {
        next(error);
    }
});

export default router;
