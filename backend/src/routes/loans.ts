import { Router } from "express";
import { Loan } from "../models/Loan";
import { LoanPayment } from "../models/LoanPayment";
import { authenticateToken } from "../middleware/auth";
import { logAuditAction } from "../utils/auditLogger";

const router = Router();

// GET all loans
router.get("/", authenticateToken, async (req, res, next) => {
    try {
        const loans = await Loan.findAll({ order: [["startDate", "DESC"], ["createdAt", "DESC"]] });
        return res.json({ success: true, data: loans });
    } catch (error) {
        next(error);
    }
});

// POST create loan
router.post("/", authenticateToken, async (req, res, next) => {
    try {
        let { providerName, accountNumber, type, amount, interestRate, startDate, endDate, emiAmount, frequency, nextDueDate, documentUrl } = req.body;

        if (!providerName || !type || amount === undefined || interestRate === undefined || !startDate) {
            return res.status(400).json({ success: false, message: "Required fields missing" });
        }

        const isBorrowing = type.toLowerCase().includes("borrowing");

        if (!isBorrowing && (!accountNumber || !endDate || emiAmount === undefined)) {
            return res.status(400).json({ success: false, message: "Required fields for bank loan missing" });
        }

        // Apply defaults for borrowings
        if (isBorrowing) {
            if (!accountNumber) {
                accountNumber = `BORR-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
            }
            if (!endDate) {
                endDate = startDate;
            }
            if (emiAmount === undefined || emiAmount === null) {
                emiAmount = 0;
            }
        }

        // Check unique accountNumber
        const exists = await Loan.findOne({ where: { accountNumber } });
        if (exists) {
            return res.status(400).json({ success: false, message: `Loan Account Number "${accountNumber}" already exists` });
        }

        const loan = await Loan.create({
            providerName,
            accountNumber,
            type,
            amount: parseFloat(amount),
            interestRate: parseFloat(interestRate),
            startDate,
            endDate,
            emiAmount: parseFloat(emiAmount),
            frequency: frequency || "Monthly",
            paidAmount: 0,
            pendingAmount: parseFloat(amount),
            nextDueDate,
            documentUrl,
            userId: req.user?.id
        });

        await logAuditAction(req, "Create Loan", `Created loan account: ${accountNumber} with ${providerName}`, "Success", { loanId: loan.id });
        return res.status(201).json({ success: true, data: loan });
    } catch (error) {
        next(error);
    }
});

// PUT update loan details
router.put("/:id", authenticateToken, async (req, res, next) => {
    try {
        const loan = await Loan.findByPk(req.params.id);
        if (!loan) return res.status(404).json({ success: false, message: "Loan account not found" });

        const { providerName, type, amount, interestRate, startDate, endDate, emiAmount, frequency, nextDueDate, documentUrl } = req.body;

        if (providerName) loan.providerName = providerName;
        if (type) loan.type = type;
        if (amount !== undefined) {
            loan.amount = parseFloat(amount);
            loan.pendingAmount = parseFloat(amount) - loan.paidAmount;
        }
        if (interestRate !== undefined) loan.interestRate = parseFloat(interestRate);
        if (startDate) loan.startDate = startDate;
        if (endDate) loan.endDate = endDate;
        if (emiAmount !== undefined) loan.emiAmount = parseFloat(emiAmount);
        if (frequency) loan.frequency = frequency;
        if (nextDueDate !== undefined) loan.nextDueDate = nextDueDate;
        if (documentUrl !== undefined) loan.documentUrl = documentUrl;

        await loan.save();
        await logAuditAction(req, "Update Loan", `Updated details for loan: ${loan.accountNumber}`, "Success", { loanId: loan.id });
        return res.json({ success: true, data: loan });
    } catch (error) {
        next(error);
    }
});

// DELETE loan record
router.delete("/:id", authenticateToken, async (req, res, next) => {
    try {
        const loan = await Loan.findByPk(req.params.id);
        if (!loan) return res.status(404).json({ success: false, message: "Loan account not found" });

        await loan.destroy();
        await logAuditAction(req, "Delete Loan", `Deleted loan account: ${loan.accountNumber}`, "Success", { loanId: loan.id });
        return res.json({ success: true, message: "Loan record deleted successfully" });
    } catch (error) {
        next(error);
    }
});

// GET all loan payments
router.get("/payments", authenticateToken, async (req, res, next) => {
    try {
        const payments = await LoanPayment.findAll({ order: [["paymentDate", "DESC"], ["createdAt", "DESC"]] });
        return res.json({ success: true, data: payments });
    } catch (error) {
        next(error);
    }
});

// POST record EMI payment
router.post("/:id/pay-emi", authenticateToken, async (req, res, next) => {
    try {
        const { paymentDate, amount, reference, walletId, isInterestOnly } = req.body;
        if (!paymentDate || !amount) {
            return res.status(400).json({ success: false, message: "Required fields missing" });
        }

        const loan = await Loan.findByPk(req.params.id);
        if (!loan) return res.status(404).json({ success: false, message: "Loan account not found" });

        const payAmt = parseFloat(amount);
        const isIntOnly = !!isInterestOnly;

        if (!isIntOnly) {
            loan.paidAmount += payAmt;
            loan.pendingAmount -= payAmt;
            await loan.save();
        }

        let accountName = undefined;
        if (walletId) {
            const { Wallet } = require("../models/Wallet");
            const { WalletTransaction } = require("../models/WalletTransaction");
            const wallet = await Wallet.findByPk(walletId);
            if (wallet) {
                wallet.currentBalance -= payAmt;
                await wallet.save();
                accountName = wallet.name;

                const isB = loan.type.toLowerCase().includes("borrowing");
                const desc = isIntOnly 
                    ? `Interest Only Repayment for Borrowing: ${loan.providerName}`
                    : (isB 
                        ? `Principal Repayment for Borrowing: ${loan.providerName}`
                        : `EMI Payment for Loan A/c ${loan.accountNumber} (${loan.providerName})`);

                await WalletTransaction.create({
                    walletId,
                    type: "Debit",
                    amount: payAmt,
                    date: paymentDate,
                    paymentMode: "Bank Transfer",
                    referenceNumber: reference || "",
                    description: desc,
                    userId: req.user?.id
                });
            }
        }

        const payment = await LoanPayment.create({
            loanId: loan.id,
            paymentDate,
            amount: payAmt,
            reference,
            walletId,
            accountName,
            isInterestOnly: isIntOnly,
            userId: req.user?.id
        });

        await logAuditAction(req, "Pay Loan EMI", `Recorded payment of ${amount} (Interest Only: ${isIntOnly}) for loan/borrowing: ${loan.providerName}`, "Success", { paymentId: payment.id });
        return res.status(201).json({ success: true, data: payment, loan });
    } catch (error) {
        next(error);
    }
});

export default router;
