import { Router } from "express";
import { Op } from "sequelize";
import { Wallet } from "../models/Wallet";
import { WalletTransaction } from "../models/WalletTransaction";
import { authenticateToken } from "../middleware/auth";
import { logAuditAction } from "../utils/auditLogger";
import { logAccountingActivity } from "../utils/accountingLogger";

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

        // Duplicate check on name
        const existing = await Wallet.findOne({
            where: { name: { [Op.iLike]: name.trim() } }
        });
        if (existing) {
            return res.status(400).json({ success: false, message: `A wallet account with name "${name}" already exists` });
        }

        const wallet = await Wallet.create({
            name,
            openingBalance: openingBalance || 0,
            currentBalance: openingBalance || 0,
            type,
            userId: req.user?.id
        });

        await logAccountingActivity({
            req,
            module: "Wallets",
            activityType: "INSERT",
            recordId: wallet.name,
            amount: wallet.openingBalance,
            description: `Created Wallet/Bank Account: ${name} (${type}) with Opening Balance: ₹${openingBalance || 0}`
        });
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

        // Duplicate check on name (exclude current)
        if (name && name.trim().toLowerCase() !== wallet.name.toLowerCase()) {
            const existing = await Wallet.findOne({
                where: {
                    id: { [Op.ne]: wallet.id },
                    name: { [Op.iLike]: name.trim() }
                }
            });
            if (existing) {
                return res.status(400).json({ success: false, message: `Another wallet account with name "${name}" already exists` });
            }
        }

        if (name) wallet.name = name;
        if (type) wallet.type = type;

        await wallet.save();
        await logAccountingActivity({
            req,
            module: "Wallets",
            activityType: "UPDATE",
            recordId: wallet.name,
            amount: wallet.currentBalance,
            description: `Updated Wallet/Bank Account details for: ${wallet.name} (${wallet.type})`
        });
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
        await logAccountingActivity({
            req,
            module: "Wallets",
            activityType: "DELETE",
            recordId: wallet.name,
            amount: wallet.currentBalance,
            description: `Deleted Wallet/Bank Account: ${wallet.name} (Balance: ₹${wallet.currentBalance})`
        });
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
            receiptUrl,
            userId: req.user?.id
        });

        await logAccountingActivity({
            req,
            module: "Wallets",
            activityType: "UPDATE",
            recordId: wallet.name,
            amount: parseFloat(amount),
            description: `Credited ₹${amount} to Wallet/Bank: ${wallet.name} (${paymentMode}) - Ref: ${referenceNumber || 'N/A'}`
        });
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
            receiptUrl,
            userId: req.user?.id
        });

        await logAccountingActivity({
            req,
            module: "Wallets",
            activityType: "UPDATE",
            recordId: wallet.name,
            amount: parseFloat(amount),
            description: `Debited ₹${amount} from Wallet/Bank: ${wallet.name} (${paymentMode}) - Ref: ${referenceNumber || 'N/A'}`
        });
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
            description: description || `Transfer to ${toWallet.name}`,
            userId: req.user?.id
        });

        await logAccountingActivity({
            req,
            module: "Wallets",
            activityType: "UPDATE",
            recordId: `${fromWallet.name} -> ${toWallet.name}`,
            amount: parseFloat(amount),
            description: `Transferred ₹${amount} from ${fromWallet.name} to ${toWallet.name}`
        });
        return res.status(201).json({ success: true, data: transaction, fromWallet, toWallet });
    } catch (error) {
        next(error);
    }
});

export default router;
