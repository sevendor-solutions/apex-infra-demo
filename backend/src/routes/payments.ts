import { Router } from "express";
import { PaymentIn } from "../models/PaymentIn";
import { PaymentOut } from "../models/PaymentOut";
import { Customer } from "../models/Customer";
import { Supplier } from "../models/Supplier";
import { Invoice } from "../models/Invoice";
import { Expense } from "../models/Expense";
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
        const { 
            customerName, 
            invoiceNumber, 
            paymentDate, 
            amount, 
            paymentMethod, 
            walletId, 
            referenceNumber, 
            notes,
            receiptNo,
            status,
            unusedAmount,
            linkedTxns,
            attachmentUrl
        } = req.body;

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
                    description: `Payment In #${receiptNo || ''} from customer ${customerName}`,
                    userId: req.user?.id
                });
            }
        }

        // 2. Reduce Customer Outstanding Balance
        const customer = await Customer.findOne({ where: { name: customerName } });
        if (customer) {
            customer.outstandingAmount = Math.max(0, (customer.outstandingAmount || 0) - payAmt);
            await customer.save();
        }

        // 3. Multi-invoice or single-invoice allocation
        let txnsArray: any[] = [];
        if (linkedTxns) {
            txnsArray = typeof linkedTxns === 'string' ? JSON.parse(linkedTxns) : linkedTxns;
            for (const item of txnsArray) {
                const linkAmt = parseFloat(item.linkedAmount) || 0;
                if (linkAmt > 0) {
                    let inv = item.txnId ? await Invoice.findByPk(item.txnId) : null;
                    if (!inv && item.refNo) {
                        inv = await Invoice.findOne({ where: { invoiceNumber: item.refNo } });
                    }
                    if (inv) {
                        inv.paidAmount = (inv.paidAmount || 0) + linkAmt;
                        inv.pendingAmount = Math.max(0, (inv.totalAmount || 0) - inv.paidAmount);
                        if (inv.pendingAmount <= 0) {
                            inv.paymentStatus = "Paid";
                        } else if (inv.paidAmount > 0) {
                            inv.paymentStatus = "Partial";
                        }
                        await inv.save();
                    }
                }
            }
        } else if (invoiceNumber) {
            const invoice = await Invoice.findOne({ where: { invoiceNumber } });
            if (invoice) {
                invoice.paidAmount = (invoice.paidAmount || 0) + payAmt;
                invoice.pendingAmount = Math.max(0, (invoice.totalAmount || 0) - invoice.paidAmount);
                if (invoice.pendingAmount <= 0) {
                    invoice.paymentStatus = "Paid";
                } else if (invoice.paidAmount > 0) {
                    invoice.paymentStatus = "Partial";
                }
                await invoice.save();
            }
        }

        const determinedStatus = status || (unusedAmount && unusedAmount > 0 ? "Advance" : "Used");

        const payment = await PaymentIn.create({
            customerName,
            invoiceNumber: invoiceNumber || (txnsArray.length > 0 ? txnsArray.map(t => t.refNo).filter(Boolean).join(", ") : undefined),
            paymentDate,
            amount: payAmt,
            paymentMethod,
            accountName,
            referenceNumber,
            notes,
            receiptNo: receiptNo ? String(receiptNo) : undefined,
            status: determinedStatus,
            unusedAmount: typeof unusedAmount === 'number' ? unusedAmount : 0,
            linkedTxns: txnsArray.length > 0 ? JSON.stringify(txnsArray) : undefined,
            attachmentUrl,
            userId: req.user?.id
        });

        await logAuditAction(req, "Record Payment In", `Recorded payment of ${payAmt} from ${customerName}`, "Success", { paymentId: payment.id });
        return res.status(201).json({ success: true, data: payment });
    } catch (error) {
        next(error);
    }
});

// DELETE Payment In (Reverses balances and invoices)
router.delete("/in/:id", authenticateToken, async (req, res, next) => {
    try {
        const payment = await PaymentIn.findByPk(req.params.id);
        if (!payment) {
            return res.status(404).json({ success: false, message: "Payment record not found" });
        }

        const payAmt = payment.amount;

        // 1. Revert Customer Outstanding
        const customer = await Customer.findOne({ where: { name: payment.customerName } });
        if (customer) {
            customer.outstandingAmount = (customer.outstandingAmount || 0) + payAmt;
            await customer.save();
        }

        // 2. Revert Invoices
        if (payment.linkedTxns) {
            try {
                const txns = JSON.parse(payment.linkedTxns);
                for (const item of txns) {
                    const linkAmt = parseFloat(item.linkedAmount) || 0;
                    if (linkAmt > 0) {
                        let inv = item.txnId ? await Invoice.findByPk(item.txnId) : null;
                        if (!inv && item.refNo) {
                            inv = await Invoice.findOne({ where: { invoiceNumber: item.refNo } });
                        }
                        if (inv) {
                            inv.paidAmount = Math.max(0, (inv.paidAmount || 0) - linkAmt);
                            inv.pendingAmount = Math.max(0, (inv.totalAmount || 0) - inv.paidAmount);
                            if (inv.paidAmount <= 0) {
                                inv.paymentStatus = "Unpaid";
                            } else {
                                inv.paymentStatus = "Partial";
                            }
                            await inv.save();
                        }
                    }
                }
            } catch (e) {
                console.warn("Failed to parse linkedTxns on delete:", e);
            }
        } else if (payment.invoiceNumber) {
            const invoice = await Invoice.findOne({ where: { invoiceNumber: payment.invoiceNumber } });
            if (invoice) {
                invoice.paidAmount = Math.max(0, (invoice.paidAmount || 0) - payAmt);
                invoice.pendingAmount = Math.max(0, (invoice.totalAmount || 0) - invoice.paidAmount);
                if (invoice.paidAmount <= 0) {
                    invoice.paymentStatus = "Unpaid";
                } else {
                    invoice.paymentStatus = "Partial";
                }
                await invoice.save();
            }
        }

        // 3. Revert Wallet
        if (payment.accountName && payment.accountName !== "Cash") {
            const wallet = await Wallet.findOne({ where: { name: payment.accountName } });
            if (wallet) {
                wallet.currentBalance -= payAmt;
                await wallet.save();

                await WalletTransaction.create({
                    walletId: wallet.id,
                    type: "Debit",
                    amount: payAmt,
                    date: new Date().toISOString().split("T")[0],
                    paymentMode: payment.paymentMethod,
                    referenceNumber: `REV-${payment.referenceNumber || payment.id}`,
                    description: `Reversal of Payment In #${payment.receiptNo || payment.id} from ${payment.customerName}`,
                    userId: req.user?.id
                });
            }
        }

        await payment.destroy();
        await logAuditAction(req, "Delete Payment In", `Deleted payment #${payment.receiptNo || payment.id} of ${payAmt} from ${payment.customerName}`, "Success", { paymentId: payment.id });
        return res.json({ success: true, message: "Payment In record deleted and balances reverted." });
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
        const { 
            supplierName, 
            billNumber, 
            paymentDate, 
            amount, 
            paymentMethod, 
            walletId, 
            referenceNumber, 
            notes,
            receiptNo,
            status,
            unusedAmount,
            linkedTxns,
            attachmentUrl
        } = req.body;

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
                    description: `Payment Out #${receiptNo || ''} to supplier ${supplierName}`,
                    userId: req.user?.id
                });
            }
        }

        // 2. Reduce Supplier Outstanding Balance
        const supplier = await Supplier.findOne({ where: { name: supplierName } });
        if (supplier) {
            supplier.outstandingAmount = Math.max(0, (supplier.outstandingAmount || 0) - payAmt);
            await supplier.save();
        }

        // 3. Multi-expense / purchase allocation
        let txnsArray: any[] = [];
        if (linkedTxns) {
            txnsArray = typeof linkedTxns === 'string' ? JSON.parse(linkedTxns) : linkedTxns;
            for (const item of txnsArray) {
                const linkAmt = parseFloat(item.linkedAmount) || 0;
                if (linkAmt > 0 && item.txnId) {
                    const exp = await Expense.findByPk(item.txnId);
                    if (exp) {
                        exp.paidAmount = (exp.paidAmount || 0) + linkAmt;
                        exp.pendingAmount = Math.max(0, (exp.totalAmount || 0) - exp.paidAmount);
                        if (exp.pendingAmount <= 0) {
                            exp.paymentStatus = "Paid";
                        } else {
                            exp.paymentStatus = "Partially Paid";
                        }
                        await exp.save();
                    }
                }
            }
        }

        const determinedStatus = status || (unusedAmount && unusedAmount > 0 ? "Advance" : "Used");

        const payment = await PaymentOut.create({
            supplierName,
            billNumber: billNumber || (txnsArray.length > 0 ? txnsArray.map(t => t.refNo).filter(Boolean).join(", ") : undefined),
            paymentDate,
            amount: payAmt,
            paymentMethod,
            accountName,
            referenceNumber,
            notes,
            receiptNo: receiptNo ? String(receiptNo) : undefined,
            status: determinedStatus,
            unusedAmount: typeof unusedAmount === 'number' ? unusedAmount : 0,
            linkedTxns: txnsArray.length > 0 ? JSON.stringify(txnsArray) : undefined,
            attachmentUrl,
            userId: req.user?.id
        });

        await logAuditAction(req, "Record Payment Out", `Recorded payment of ${payAmt} to ${supplierName}`, "Success", { paymentId: payment.id });
        return res.status(201).json({ success: true, data: payment });
    } catch (error) {
        next(error);
    }
});

// DELETE Payment Out (Reverses balances and expenses)
router.delete("/out/:id", authenticateToken, async (req, res, next) => {
    try {
        const payment = await PaymentOut.findByPk(req.params.id);
        if (!payment) {
            return res.status(404).json({ success: false, message: "Payment record not found" });
        }

        const payAmt = payment.amount;

        // 1. Revert Supplier Outstanding
        const supplier = await Supplier.findOne({ where: { name: payment.supplierName } });
        if (supplier) {
            supplier.outstandingAmount = (supplier.outstandingAmount || 0) + payAmt;
            await supplier.save();
        }

        // 2. Revert Expenses
        if (payment.linkedTxns) {
            try {
                const txns = JSON.parse(payment.linkedTxns);
                for (const item of txns) {
                    const linkAmt = parseFloat(item.linkedAmount) || 0;
                    if (linkAmt > 0 && item.txnId) {
                        const exp = await Expense.findByPk(item.txnId);
                        if (exp) {
                            exp.paidAmount = Math.max(0, (exp.paidAmount || 0) - linkAmt);
                            exp.pendingAmount = Math.max(0, (exp.totalAmount || 0) - exp.paidAmount);
                            if (exp.paidAmount <= 0) {
                                exp.paymentStatus = "Unpaid";
                            } else {
                                exp.paymentStatus = "Partially Paid";
                            }
                            await exp.save();
                        }
                    }
                }
            } catch (e) {
                console.warn("Failed to parse linkedTxns on delete out:", e);
            }
        }

        // 3. Revert Wallet
        if (payment.accountName && payment.accountName !== "Cash") {
            const wallet = await Wallet.findOne({ where: { name: payment.accountName } });
            if (wallet) {
                wallet.currentBalance += payAmt;
                await wallet.save();

                await WalletTransaction.create({
                    walletId: wallet.id,
                    type: "Credit",
                    amount: payAmt,
                    date: new Date().toISOString().split("T")[0],
                    paymentMode: payment.paymentMethod,
                    referenceNumber: `REV-${payment.referenceNumber || payment.id}`,
                    description: `Reversal of Payment Out #${payment.receiptNo || payment.id} to ${payment.supplierName}`,
                    userId: req.user?.id
                });
            }
        }

        await payment.destroy();
        await logAuditAction(req, "Delete Payment Out", `Deleted disbursement #${payment.receiptNo || payment.id} of ${payAmt} to ${payment.supplierName}`, "Success", { paymentId: payment.id });
        return res.json({ success: true, message: "Payment Out record deleted and balances reverted." });
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
