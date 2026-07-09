import { Router } from "express";
import { Wallet } from "../models/Wallet";
import { WalletTransaction } from "../models/WalletTransaction";
import { authenticateToken } from "../middleware/auth";
import { logAuditAction } from "../utils/auditLogger";

const router = Router();

// GET all wallets
router.get("/", authenticateToken, async (req, res, next) => {
    try {
        const wallets = await Wallet.findAll({ order: [["name", "ASC"]] });
        return res.json({ success: true, data: wallets });
    } catch (error) {
        next(error);
    }
});

// POST create wallet
router.post("/", authenticateToken, async (req, res, next) => {
    try {
        const { name, openingBalance, type } = req.body;
        if (!name || !type) {
            return res.status(400).json({ success: false, message: "Name and Type are required" });
        }

        const wallet = await Wallet.create({
            name,
            openingBalance: openingBalance || 0,
            currentBalance: openingBalance || 0,
            type
        });

        await logAuditAction(req, "Create Wallet", `Created wallet: ${name} (${type})`, "Success", { walletId: wallet.id });
        return res.status(201).json({ success: true, data: wallet });
    } catch (error) {
        next(error);
    }
});

// PUT update wallet
router.put("/:id", authenticateToken, async (req, res, next) => {
    try {
        const wallet = await Wallet.findByPk(req.params.id);
        if (!wallet) return res.status(404).json({ success: false, message: "Wallet not found" });

        const { name, type } = req.body;
        if (name) wallet.name = name;
        if (type) wallet.type = type;

        await wallet.save();
        await logAuditAction(req, "Update Wallet", `Updated wallet details for: ${wallet.name}`, "Success", { walletId: wallet.id });
        return res.json({ success: true, data: wallet });
    } catch (error) {
        next(error);
    }
});

// DELETE wallet
router.delete("/:id", authenticateToken, async (req, res, next) => {
    try {
        const wallet = await Wallet.findByPk(req.params.id);
        if (!wallet) return res.status(404).json({ success: false, message: "Wallet not found" });

        await wallet.destroy();
        await logAuditAction(req, "Delete Wallet", `Deleted wallet: ${wallet.name}`, "Success", { walletId: wallet.id });
        return res.json({ success: true, message: "Wallet deleted successfully" });
    } catch (error) {
        next(error);
    }
});

// GET all wallet transactions
router.get("/transactions", authenticateToken, async (req, res, next) => {
    try {
        const { walletId } = req.query;
        const whereClause = walletId ? { walletId } : {};
        const transactions = await WalletTransaction.findAll({
            where: whereClause,
            order: [["date", "DESC"], ["createdAt", "DESC"]]
        });
        return res.json({ success: true, data: transactions });
    } catch (error) {
        next(error);
    }
});

// POST add money (credit)
router.post("/add-money", authenticateToken, async (req, res, next) => {
    try {
        const { walletId, amount, date, paymentMode, referenceNumber, description, receiptUrl } = req.body;
        if (!walletId || !amount || !date || !paymentMode) {
            return res.status(400).json({ success: false, message: "Required fields missing" });
        }

        const wallet = await Wallet.findByPk(walletId);
        if (!wallet) return res.status(404).json({ success: false, message: "Wallet not found" });

        wallet.currentBalance += parseFloat(amount);
        await wallet.save();

        const transaction = await WalletTransaction.create({
            walletId,
            type: "Credit",
            amount: parseFloat(amount),
            date,
            paymentMode,
            referenceNumber,
            description,
            receiptUrl
        });

        await logAuditAction(req, "Wallet Credit", `Credited ${amount} to wallet: ${wallet.name}`, "Success", { transactionId: transaction.id });
        return res.status(201).json({ success: true, data: transaction, wallet });
    } catch (error) {
        next(error);
    }
});

// POST withdraw money (debit)
router.post("/withdraw-money", authenticateToken, async (req, res, next) => {
    try {
        const { walletId, amount, date, paymentMode, referenceNumber, description, receiptUrl } = req.body;
        if (!walletId || !amount || !date || !paymentMode) {
            return res.status(400).json({ success: false, message: "Required fields missing" });
        }

        const wallet = await Wallet.findByPk(walletId);
        if (!wallet) return res.status(404).json({ success: false, message: "Wallet not found" });

        wallet.currentBalance -= parseFloat(amount);
        await wallet.save();

        const transaction = await WalletTransaction.create({
            walletId,
            type: "Debit",
            amount: parseFloat(amount),
            date,
            paymentMode,
            referenceNumber,
            description,
            receiptUrl
        });

        await logAuditAction(req, "Wallet Debit", `Debited ${amount} from wallet: ${wallet.name}`, "Success", { transactionId: transaction.id });
        return res.status(201).json({ success: true, data: transaction, wallet });
    } catch (error) {
        next(error);
    }
});

// POST transfer between wallets
router.post("/transfer", authenticateToken, async (req, res, next) => {
    try {
        const { fromWalletId, toWalletId, amount, date, description } = req.body;
        if (!fromWalletId || !toWalletId || !amount || !date) {
            return res.status(400).json({ success: false, message: "Required fields missing" });
        }

        const fromWallet = await Wallet.findByPk(fromWalletId);
        const toWallet = await Wallet.findByPk(toWalletId);

        if (!fromWallet || !toWallet) {
            return res.status(404).json({ success: false, message: "Source or Target wallet not found" });
        }

        fromWallet.currentBalance -= parseFloat(amount);
        toWallet.currentBalance += parseFloat(amount);

        await fromWallet.save();
        await toWallet.save();

        const transaction = await WalletTransaction.create({
            walletId: fromWalletId,
            toWalletId: toWalletId,
            type: "Transfer",
            amount: parseFloat(amount),
            date,
            paymentMode: "Transfer",
            description: description || `Transfer to ${toWallet.name}`
        });

        await logAuditAction(req, "Wallet Transfer", `Transferred ${amount} from ${fromWallet.name} to ${toWallet.name}`, "Success", { transactionId: transaction.id });
        return res.status(201).json({ success: true, data: transaction, fromWallet, toWallet });
    } catch (error) {
        next(error);
    }
});

export default router;
