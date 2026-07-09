import { Router } from "express";
import { PaymentIn } from "../models/PaymentIn";
import { PaymentOut } from "../models/PaymentOut";
import { Customer } from "../models/Customer";
import { Supplier } from "../models/Supplier";
import { Invoice } from "../models/Invoice";
import { Wallet } from "../models/Wallet";
import { WalletTransaction } from "../models/WalletTransaction";
import { authenticateToken } from "../middleware/auth";
import { logAuditAction } from "../utils/auditLogger";

const router = Router();

// GET all Payments In (Receivables)
router.get("/in", authenticateToken, async (req, res, next) => {
    try {
        const payments = await PaymentIn.findAll({ order: [["paymentDate", "DESC"], ["createdAt", "DESC"]] });
        return res.json({ success: true, data: payments });
    } catch (error) {
        next(error);
    }
});

// POST record Payment In
router.post("/in", authenticateToken, async (req, res, next) => {
    try {
        const { customerName, invoiceNumber, paymentDate, amount, paymentMethod, walletId, referenceNumber, notes } = req.body;

        if (!customerName || !paymentDate || !amount || !paymentMethod) {
            return res.status(400).json({ success: false, message: "Required fields missing" });
        }

        const payAmt = parseFloat(amount);

        // 1. Find and update Wallet if walletId is selected
        let accountName = "Cash";
        if (walletId) {
            const wallet = await Wallet.findByPk(walletId);
            if (wallet) {
                wallet.currentBalance += payAmt;
                await wallet.save();
                accountName = wallet.name;

                // Log wallet transaction
                await WalletTransaction.create({
                    walletId,
                    type: "Credit",
                    amount: payAmt,
                    date: paymentDate,
                    paymentMode: paymentMethod,
                    referenceNumber,
                    description: `Payment In from customer ${customerName}`
                });
            }
        }

        const payment = await PaymentIn.create({
            customerName,
            invoiceNumber,
            paymentDate,
            amount: payAmt,
            paymentMethod,
            accountName,
            referenceNumber,
            notes
        });

        // 2. Reduce Customer Outstanding Balance
        const customer = await Customer.findOne({ where: { name: customerName } });
        if (customer) {
            customer.outstandingAmount -= payAmt;
            if (customer.outstandingAmount < 0) customer.outstandingAmount = 0;
            await customer.save();
        }

        // 3. Update Invoice if linked
        if (invoiceNumber) {
            const invoice = await Invoice.findOne({ where: { invoiceNumber } });
            if (invoice) {
                invoice.paidAmount += payAmt;
                invoice.pendingAmount -= payAmt;
                if (invoice.pendingAmount < 0) invoice.pendingAmount = 0;

                if (invoice.paidAmount >= invoice.totalAmount) {
                    invoice.paymentStatus = "Paid";
                } else if (invoice.paidAmount > 0) {
                    invoice.paymentStatus = "Partial";
                }
                await invoice.save();
            }
        }

        await logAuditAction(req, "Record Payment In", `Recorded payment of ${payAmt} from ${customerName}`, "Success", { paymentId: payment.id });
        return res.status(201).json({ success: true, data: payment });
    } catch (error) {
        next(error);
    }
});

// GET all Payments Out (Payables)
router.get("/out", authenticateToken, async (req, res, next) => {
    try {
        const payments = await PaymentOut.findAll({ order: [["paymentDate", "DESC"], ["createdAt", "DESC"]] });
        return res.json({ success: true, data: payments });
    } catch (error) {
        next(error);
    }
});

// POST record Payment Out
router.post("/out", authenticateToken, async (req, res, next) => {
    try {
        const { supplierName, billNumber, paymentDate, amount, paymentMethod, walletId, referenceNumber, notes } = req.body;

        if (!supplierName || !paymentDate || !amount || !paymentMethod) {
            return res.status(400).json({ success: false, message: "Required fields missing" });
        }

        const payAmt = parseFloat(amount);

        // 1. Find and update Wallet if walletId is selected
        let accountName = "Cash";
        if (walletId) {
            const wallet = await Wallet.findByPk(walletId);
            if (wallet) {
                wallet.currentBalance -= payAmt;
                await wallet.save();
                accountName = wallet.name;

                // Log wallet transaction
                await WalletTransaction.create({
                    walletId,
                    type: "Debit",
                    amount: payAmt,
                    date: paymentDate,
                    paymentMode: paymentMethod,
                    referenceNumber,
                    description: `Payment Out to supplier ${supplierName}`
                });
            }
        }

        const payment = await PaymentOut.create({
            supplierName,
            billNumber,
            paymentDate,
            amount: payAmt,
            paymentMethod,
            accountName,
            referenceNumber,
            notes
        });

        // 2. Reduce Supplier Outstanding Balance
        const supplier = await Supplier.findOne({ where: { name: supplierName } });
        if (supplier) {
            supplier.outstandingAmount -= payAmt;
            if (supplier.outstandingAmount < 0) supplier.outstandingAmount = 0;
            await supplier.save();
        }

        await logAuditAction(req, "Record Payment Out", `Recorded payment of ${payAmt} to ${supplierName}`, "Success", { paymentId: payment.id });
        return res.status(201).json({ success: true, data: payment });
    } catch (error) {
        next(error);
    }
});

// GET pending customer & supplier payments
router.get("/pending", authenticateToken, async (req, res, next) => {
    try {
        // Query unpaid/partial invoices
        const pendingInvoices = await Invoice.findAll({
            where: {
                paymentStatus: ["Unpaid", "Partial"]
            },
            order: [["date", "ASC"]]
        });

        // Query outstanding suppliers
        const pendingSuppliers = await Supplier.findAll({
            where: {
                outstandingAmount: {
                    [Symbol.for("gt") as any]: 0 // Outstanding > 0
                }
            },
            order: [["name", "ASC"]]
        });

        return res.json({
            success: true,
            data: {
                customerPending: pendingInvoices,
                supplierPending: pendingSuppliers
            }
        });
    } catch (error) {
        next(error);
    }
});

export default router;
