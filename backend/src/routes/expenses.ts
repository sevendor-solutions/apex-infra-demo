import { Router } from "express";
import { Expense } from "../models/Expense";
import { Wallet } from "../models/Wallet";
import { WalletTransaction } from "../models/WalletTransaction";
import { authenticateToken } from "../middleware/auth";
import { logAuditAction } from "../utils/auditLogger";
import { logAccountingActivity } from "../utils/accountingLogger";

const router = Router();

// GET all expenses (optional filters: party, category)
router.get("/", authenticateToken, async (req, res, next) => {
    try {
        const expenses = await Expense.findAll({ order: [["billDate", "DESC"]] });
        return res.json({ success: true, data: expenses });
    } catch (error) {
        next(error);
    }
});

// GET single expense by ID
router.get("/:id", authenticateToken, async (req, res, next) => {
    try {
        const expense = await Expense.findByPk(req.params.id);
        if (!expense) return res.status(404).json({ success: false, message: "Expense not found" });
        return res.json({ success: true, data: expense });
    } catch (error) {
        next(error);
    }
});

// POST create expense — auto-generate ID
router.post("/", authenticateToken, async (req, res, next) => {
    try {
        // Find max existing expense number
        const all = await Expense.findAll({ attributes: ["id"] });
        let nextNum = 1;
        all.forEach(e => {
            const match = e.id.match(/^exp(\d+)$/);
            if (match) {
                const num = parseInt(match[1], 10);
                if (num >= nextNum) nextNum = num + 1;
            }
        });
        const { id: _id, ...body } = req.body; // strip any incoming id
        
        const totalAmt = parseFloat(body.totalAmount || 0);
        let paidAmt = parseFloat(body.paidAmount !== undefined ? body.paidAmount : totalAmt);
        if (body.paymentType === "Credit" && body.paidAmount === undefined) {
            paidAmt = 0;
        }
        const pendingAmt = totalAmt - paidAmt;
        let payStatus = "Paid";
        if (paidAmt === 0) {
            payStatus = "Unpaid";
        } else if (pendingAmt > 0) {
            payStatus = "Partially Paid";
        }

        let accountName = body.accountName;
        // Deduct money from wallet if walletId provided and paidAmt > 0
        if (body.walletId && paidAmt > 0) {
            const wallet = await Wallet.findByPk(body.walletId);
            if (wallet) {
                wallet.currentBalance -= paidAmt;
                await wallet.save();
                accountName = wallet.name;

                // Log wallet transaction
                await WalletTransaction.create({
                    walletId: body.walletId,
                    type: "Debit",
                    amount: paidAmt,
                    date: body.billDate,
                    paymentMode: body.paymentType || "Cash",
                    referenceNumber: body.referenceNo,
                    description: `Paid expense: ${body.party} (${body.expenseCategory})`,
                    userId: req.user?.id
                });
            }
        }

        const newExpense = await Expense.create({ 
            ...body, 
            id: `exp${nextNum}`,
            paidAmount: paidAmt,
            pendingAmount: pendingAmt,
            paymentStatus: payStatus,
            accountName,
            userId: req.user?.id
        });
        
        await logAccountingActivity({
            req,
            module: "Expenses",
            activityType: "INSERT",
            recordId: newExpense.expenseNo || newExpense.id,
            amount: newExpense.totalAmount,
            description: `Created Expense Bill #${newExpense.expenseNo || newExpense.id} for party "${newExpense.party}" (${newExpense.expenseCategory}) - Total: ₹${newExpense.totalAmount}, Paid: ₹${newExpense.paidAmount}`
        });
        
        return res.status(201).json({ success: true, data: newExpense });
    } catch (error) {
        next(error);
    }
});

// PUT update expense
router.put("/:id", authenticateToken, async (req, res, next) => {
    try {
        const expense = await Expense.findByPk(req.params.id);
        if (!expense) return res.status(404).json({ success: false, message: "Expense not found" });
        const { id: _id, ...body } = req.body;
        
        const totalAmt = parseFloat(body.totalAmount || 0);
        let paidAmt = parseFloat(body.paidAmount !== undefined ? body.paidAmount : totalAmt);
        if (body.paymentType === "Credit" && body.paidAmount === undefined) {
            paidAmt = 0;
        }
        const pendingAmt = totalAmt - paidAmt;
        let payStatus = "Paid";
        if (paidAmt === 0) {
            payStatus = "Unpaid";
        } else if (pendingAmt > 0) {
            payStatus = "Partially Paid";
        }

        // Revert old wallet balance
        if (expense.walletId && expense.paidAmount > 0) {
            const oldWallet = await Wallet.findByPk(expense.walletId);
            if (oldWallet) {
                oldWallet.currentBalance += expense.paidAmount;
                await oldWallet.save();
            }
        }

        let accountName = body.accountName;
        // Apply new wallet balance
        if (body.walletId && paidAmt > 0) {
            const newWallet = await Wallet.findByPk(body.walletId);
            if (newWallet) {
                newWallet.currentBalance -= paidAmt;
                await newWallet.save();
                accountName = newWallet.name;

                // Log wallet transaction
                await WalletTransaction.create({
                    walletId: body.walletId,
                    type: "Debit",
                    amount: paidAmt,
                    date: body.billDate,
                    paymentMode: body.paymentType || "Cash",
                    referenceNumber: body.referenceNo,
                    description: `Updated expense: ${body.party} (${body.expenseCategory})`,
                    userId: req.user?.id
                });
            }
        }

        await expense.update({
            ...body,
            paidAmount: paidAmt,
            pendingAmount: pendingAmt,
            paymentStatus: payStatus,
            accountName
        });
        
        await logAccountingActivity({
            req,
            module: "Expenses",
            activityType: "UPDATE",
            recordId: expense.expenseNo || expense.id,
            amount: totalAmt,
            description: `Updated Expense Bill #${expense.expenseNo || expense.id} for party "${expense.party}" (${expense.expenseCategory}) - Total: ₹${totalAmt}, Paid: ₹${paidAmt}, Status: ${payStatus}`
        });
        
        return res.json({ success: true, data: expense });
    } catch (error) {
        next(error);
    }
});

// DELETE expense
router.delete("/:id", authenticateToken, async (req, res, next) => {
    try {
        const expense = await Expense.findByPk(req.params.id);
        if (!expense) return res.status(404).json({ success: false, message: "Expense not found" });
        const billNo = expense.expenseNo || expense.id;
        const party = expense.party;
        const total = expense.totalAmount;

        // Revert wallet balance if walletId existed
        if (expense.walletId && expense.paidAmount > 0) {
            const wallet = await Wallet.findByPk(expense.walletId);
            if (wallet) {
                wallet.currentBalance += expense.paidAmount;
                await wallet.save();

                // Log wallet transaction
                await WalletTransaction.create({
                    walletId: expense.walletId,
                    type: "Credit",
                    amount: expense.paidAmount,
                    date: new Date().toISOString().split('T')[0],
                    paymentMode: expense.paymentType || "Cash",
                    description: `Deleted expense: ${expense.party} (${expense.expenseCategory})`,
                    userId: req.user?.id
                });
            }
        }

        await expense.destroy();
        
        await logAccountingActivity({
            req,
            module: "Expenses",
            activityType: "DELETE",
            recordId: billNo,
            amount: total,
            description: `Deleted Expense Bill #${billNo} of party: "${party}" - Total: ₹${total}`
        });
        
        return res.json({ success: true, message: "Expense deleted" });
    } catch (error) {
        next(error);
    }
});

export default router;
