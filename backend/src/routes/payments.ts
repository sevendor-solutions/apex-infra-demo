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
import { runSchemaMigrations } from "../utils/schemaMigration";
import { logAccountingActivity } from "../utils/accountingLogger";

const router = Router();

// GET all Payments In (Receivables)
router.get("/in", authenticateToken, async (req, res, next) => {
    try {
        const payments = await PaymentIn.findAll({ order: [["paymentDate", "DESC"], ["createdAt", "DESC"]] });
        return res.json({ success: true, data: payments });
    } catch (error: any) {
        if (error?.message?.includes("does not exist") || error?.parent?.message?.includes("does not exist")) {
            console.warn("⚠️ Missing column detected on payments_in query, auto-healing schema...");
            try {
                await runSchemaMigrations(true);
                const retryPayments = await PaymentIn.findAll({ order: [["paymentDate", "DESC"], ["createdAt", "DESC"]] });
                return res.json({ success: true, data: retryPayments });
            } catch (retryErr) {
                return next(retryErr);
            }
        }
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

        await logAccountingActivity({
            req,
            module: "Payment-In",
            activityType: "INSERT",
            recordId: payment.receiptNo || payment.id,
            amount: payAmt,
            description: `Recorded Payment-In #${payment.receiptNo || payment.id} of ₹${payAmt} from ${customerName} via ${paymentMethod} (${accountName})`
        });
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
        await logAccountingActivity({
            req,
            module: "Payment-In",
            activityType: "DELETE",
            recordId: payment.receiptNo || payment.id,
            amount: payAmt,
            description: `Deleted Payment-In #${payment.receiptNo || payment.id} of ₹${payAmt} from ${payment.customerName}`
        });
        return res.json({ success: true, message: "Payment In record deleted and balances reverted." });
    } catch (error) {
        next(error);
    }
});

// PUT update Payment In
router.put("/in/:id", authenticateToken, async (req, res, next) => {
    try {
        const payment = await PaymentIn.findByPk(req.params.id);
        if (!payment) {
            return res.status(404).json({ success: false, message: "Payment record not found" });
        }

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

        const oldAmount = payment.amount;
        const oldCustomerName = payment.customerName;
        const oldAccountName = payment.accountName;
        const oldPaymentMethod = payment.paymentMethod;
        const oldDate = payment.paymentDate;
        const oldLinkedTxns = payment.linkedTxns;
        const oldInvoiceNumber = payment.invoiceNumber;

        const newPayAmt = parseFloat(amount);

        // 1. Revert Old Effects:
        // 1a. Revert old customer outstanding
        const oldCustomer = await Customer.findOne({ where: { name: oldCustomerName } });
        if (oldCustomer) {
            oldCustomer.outstandingAmount = (oldCustomer.outstandingAmount || 0) + oldAmount;
            await oldCustomer.save();
        }

        // 1b. Revert old invoices
        if (oldLinkedTxns) {
            try {
                const txns = JSON.parse(oldLinkedTxns);
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
                            inv.paymentStatus = inv.paidAmount <= 0 ? "Unpaid" : "Partial";
                            await inv.save();
                        }
                    }
                }
            } catch (e) {
                console.warn("Failed to parse old linkedTxns on update:", e);
            }
        } else if (oldInvoiceNumber) {
            const inv = await Invoice.findOne({ where: { invoiceNumber: oldInvoiceNumber } });
            if (inv) {
                inv.paidAmount = Math.max(0, (inv.paidAmount || 0) - oldAmount);
                inv.pendingAmount = Math.max(0, (inv.totalAmount || 0) - inv.paidAmount);
                inv.paymentStatus = inv.paidAmount <= 0 ? "Unpaid" : "Partial";
                await inv.save();
            }
        }

        // 1c. Revert old wallet balance
        if (oldAccountName && oldAccountName !== "Cash") {
            const oldWallet = await Wallet.findOne({ where: { name: oldAccountName } });
            if (oldWallet) {
                oldWallet.currentBalance -= oldAmount;
                await oldWallet.save();
            }
        }

        // 2. Apply New Effects:
        // 2a. Apply new wallet
        let newAccountName = "Cash";
        if (walletId) {
            const newWallet = await Wallet.findByPk(walletId);
            if (newWallet) {
                newWallet.currentBalance += newPayAmt;
                await newWallet.save();
                newAccountName = newWallet.name;

                await WalletTransaction.create({
                    walletId: newWallet.id,
                    type: "Credit",
                    amount: newPayAmt,
                    date: paymentDate || new Date().toISOString().split("T")[0],
                    paymentMode: paymentMethod,
                    referenceNumber: referenceNumber || `PAY-${payment.id}`,
                    description: `Updated Payment In #${receiptNo || payment.receiptNo || payment.id} from customer ${customerName}`,
                    userId: req.user?.id
                });
            }
        }

        // 2b. Apply new customer outstanding
        const newCustomer = await Customer.findOne({ where: { name: customerName } });
        if (newCustomer) {
            newCustomer.outstandingAmount = Math.max(0, (newCustomer.outstandingAmount || 0) - newPayAmt);
            await newCustomer.save();
        }

        // 2c. Apply new invoices
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
                        inv.paymentStatus = inv.pendingAmount <= 0 ? "Paid" : (inv.paidAmount > 0 ? "Partial" : "Unpaid");
                        await inv.save();
                    }
                }
            }
        } else if (invoiceNumber) {
            const inv = await Invoice.findOne({ where: { invoiceNumber } });
            if (inv) {
                inv.paidAmount = (inv.paidAmount || 0) + newPayAmt;
                inv.pendingAmount = Math.max(0, (inv.totalAmount || 0) - inv.paidAmount);
                inv.paymentStatus = inv.pendingAmount <= 0 ? "Paid" : (inv.paidAmount > 0 ? "Partial" : "Unpaid");
                await inv.save();
            }
        }

        // 3. Update payment record
        const determinedStatus = status || (unusedAmount && unusedAmount > 0 ? "Advance" : "Used");
        payment.customerName = customerName;
        payment.invoiceNumber = invoiceNumber || (txnsArray.length > 0 ? txnsArray.map(t => t.refNo).filter(Boolean).join(", ") : undefined);
        payment.paymentDate = paymentDate;
        payment.amount = newPayAmt;
        payment.paymentMethod = paymentMethod;
        payment.accountName = newAccountName;
        payment.referenceNumber = referenceNumber;
        payment.notes = notes;
        if (receiptNo) payment.receiptNo = String(receiptNo);
        payment.status = determinedStatus;
        payment.unusedAmount = typeof unusedAmount === 'number' ? unusedAmount : 0;
        payment.linkedTxns = txnsArray.length > 0 ? JSON.stringify(txnsArray) : undefined;
        if (attachmentUrl !== undefined) payment.attachmentUrl = attachmentUrl;
        await payment.save();

        // 4. Log Accounting Activity (Audit Trail)
        await logAccountingActivity({
            req,
            module: "Payment-In",
            activityType: "UPDATE",
            recordId: payment.receiptNo || payment.id,
            amount: newPayAmt,
            description: `Updated Payment-In #${payment.receiptNo || payment.id} of ₹${newPayAmt} (prev ₹${oldAmount}) from ${customerName}`,
            metadata: {
                previous: {
                    customerName: oldCustomerName,
                    amount: oldAmount,
                    paymentMethod: oldPaymentMethod,
                    accountName: oldAccountName,
                    date: oldDate
                },
                current: {
                    customerName,
                    amount: newPayAmt,
                    paymentMethod,
                    accountName: newAccountName,
                    date: paymentDate
                }
            }
        });

        return res.json({ success: true, data: payment, message: "Payment-In updated successfully" });
    } catch (error) {
        next(error);
    }
});

// GET all Payments Out (Payables)
router.get("/out", authenticateToken, async (req, res, next) => {
    try {
        const payments = await PaymentOut.findAll({ order: [["paymentDate", "DESC"], ["createdAt", "DESC"]] });
        return res.json({ success: true, data: payments });
    } catch (error: any) {
        if (error?.message?.includes("does not exist") || error?.parent?.message?.includes("does not exist")) {
            console.warn("⚠️ Missing column detected on payments_out query, auto-healing schema...");
            try {
                await runSchemaMigrations(true);
                const retryPayments = await PaymentOut.findAll({ order: [["paymentDate", "DESC"], ["createdAt", "DESC"]] });
                return res.json({ success: true, data: retryPayments });
            } catch (retryErr) {
                return next(retryErr);
            }
        }
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

        await logAccountingActivity({
            req,
            module: "Payment-Out",
            activityType: "INSERT",
            recordId: payment.receiptNo || payment.id,
            amount: payAmt,
            description: `Recorded Payment-Out #${payment.receiptNo || payment.id} of ₹${payAmt} to ${supplierName} via ${paymentMethod} (${accountName})`
        });
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
        await logAccountingActivity({
            req,
            module: "Payment-Out",
            activityType: "DELETE",
            recordId: payment.receiptNo || payment.id,
            amount: payAmt,
            description: `Deleted Payment-Out #${payment.receiptNo || payment.id} of ₹${payAmt} to ${payment.supplierName}`
        });
        return res.json({ success: true, message: "Payment Out record deleted and balances reverted." });
    } catch (error) {
        next(error);
    }
});

// PUT update Payment Out
router.put("/out/:id", authenticateToken, async (req, res, next) => {
    try {
        const payment = await PaymentOut.findByPk(req.params.id);
        if (!payment) {
            return res.status(404).json({ success: false, message: "Payment record not found" });
        }

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

        const oldAmount = payment.amount;
        const oldSupplierName = payment.supplierName;
        const oldAccountName = payment.accountName;
        const oldPaymentMethod = payment.paymentMethod;
        const oldDate = payment.paymentDate;
        const oldLinkedTxns = payment.linkedTxns;

        const newPayAmt = parseFloat(amount);

        // 1. Revert Old Effects:
        // 1a. Revert old supplier outstanding
        const oldSupplier = await Supplier.findOne({ where: { name: oldSupplierName } });
        if (oldSupplier) {
            oldSupplier.outstandingAmount = (oldSupplier.outstandingAmount || 0) + oldAmount;
            await oldSupplier.save();
        }

        // 1b. Revert old expenses
        if (oldLinkedTxns) {
            try {
                const txns = JSON.parse(oldLinkedTxns);
                for (const item of txns) {
                    const linkAmt = parseFloat(item.linkedAmount) || 0;
                    if (linkAmt > 0 && item.txnId) {
                        const exp = await Expense.findByPk(item.txnId);
                        if (exp) {
                            exp.paidAmount = Math.max(0, (exp.paidAmount || 0) - linkAmt);
                            exp.pendingAmount = Math.max(0, (exp.totalAmount || 0) - exp.paidAmount);
                            exp.paymentStatus = exp.paidAmount <= 0 ? "Unpaid" : "Partially Paid";
                            await exp.save();
                        }
                    }
                }
            } catch (e) {
                console.warn("Failed to parse old linkedTxns on update out:", e);
            }
        }

        // 1c. Revert old wallet balance
        if (oldAccountName && oldAccountName !== "Cash") {
            const oldWallet = await Wallet.findOne({ where: { name: oldAccountName } });
            if (oldWallet) {
                oldWallet.currentBalance += oldAmount;
                await oldWallet.save();
            }
        }

        // 2. Apply New Effects:
        // 2a. Apply new wallet
        let newAccountName = "Cash";
        if (walletId) {
            const newWallet = await Wallet.findByPk(walletId);
            if (newWallet) {
                newWallet.currentBalance -= newPayAmt;
                await newWallet.save();
                newAccountName = newWallet.name;

                await WalletTransaction.create({
                    walletId: newWallet.id,
                    type: "Debit",
                    amount: newPayAmt,
                    date: paymentDate || new Date().toISOString().split("T")[0],
                    paymentMode: paymentMethod,
                    referenceNumber: referenceNumber || `PAY-${payment.id}`,
                    description: `Updated Payment Out #${receiptNo || payment.receiptNo || payment.id} to supplier ${supplierName}`,
                    userId: req.user?.id
                });
            }
        }

        // 2b. Apply new supplier outstanding
        const newSupplier = await Supplier.findOne({ where: { name: supplierName } });
        if (newSupplier) {
            newSupplier.outstandingAmount = Math.max(0, (newSupplier.outstandingAmount || 0) - newPayAmt);
            await newSupplier.save();
        }

        // 2c. Apply new expenses
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
                        exp.paymentStatus = exp.pendingAmount <= 0 ? "Paid" : "Partially Paid";
                        await exp.save();
                    }
                }
            }
        }

        // 3. Update payment record
        const determinedStatus = status || (unusedAmount && unusedAmount > 0 ? "Advance" : "Used");
        payment.supplierName = supplierName;
        payment.billNumber = billNumber || (txnsArray.length > 0 ? txnsArray.map(t => t.refNo).filter(Boolean).join(", ") : undefined);
        payment.paymentDate = paymentDate;
        payment.amount = newPayAmt;
        payment.paymentMethod = paymentMethod;
        payment.accountName = newAccountName;
        payment.referenceNumber = referenceNumber;
        payment.notes = notes;
        if (receiptNo) payment.receiptNo = String(receiptNo);
        payment.status = determinedStatus;
        payment.unusedAmount = typeof unusedAmount === 'number' ? unusedAmount : 0;
        payment.linkedTxns = txnsArray.length > 0 ? JSON.stringify(txnsArray) : undefined;
        if (attachmentUrl !== undefined) payment.attachmentUrl = attachmentUrl;
        await payment.save();

        // 4. Log Accounting Activity (Audit Trail)
        await logAccountingActivity({
            req,
            module: "Payment-Out",
            activityType: "UPDATE",
            recordId: payment.receiptNo || payment.id,
            amount: newPayAmt,
            description: `Updated Payment-Out #${payment.receiptNo || payment.id} of ₹${newPayAmt} (prev ₹${oldAmount}) to ${supplierName}`,
            metadata: {
                previous: {
                    supplierName: oldSupplierName,
                    amount: oldAmount,
                    paymentMethod: oldPaymentMethod,
                    accountName: oldAccountName,
                    date: oldDate
                },
                current: {
                    supplierName,
                    amount: newPayAmt,
                    paymentMethod,
                    accountName: newAccountName,
                    date: paymentDate
                }
            }
        });

        return res.json({ success: true, data: payment, message: "Payment-Out updated successfully" });
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
