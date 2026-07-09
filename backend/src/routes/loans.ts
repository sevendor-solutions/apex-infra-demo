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
        const { providerName, accountNumber, type, amount, interestRate, startDate, endDate, emiAmount, frequency, nextDueDate, documentUrl } = req.body;

        if (!providerName || !accountNumber || !type || !amount || !interestRate || !startDate || !endDate || !emiAmount) {
            return res.status(400).json({ success: false, message: "Required fields missing" });
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
            documentUrl
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
        const { paymentDate, amount, reference } = req.body;
        if (!paymentDate || !amount) {
            return res.status(400).json({ success: false, message: "Required fields missing" });
        }

        const loan = await Loan.findByPk(req.params.id);
        if (!loan) return res.status(404).json({ success: false, message: "Loan account not found" });

        const payAmt = parseFloat(amount);
        loan.paidAmount += payAmt;
        loan.pendingAmount -= payAmt;
        await loan.save();

        const payment = await LoanPayment.create({
            loanId: loan.id,
            paymentDate,
            amount: payAmt,
            reference
        });

        await logAuditAction(req, "Pay Loan EMI", `Paid EMI of ${amount} for loan: ${loan.accountNumber}`, "Success", { paymentId: payment.id });
        return res.status(201).json({ success: true, data: payment, loan });
    } catch (error) {
        next(error);
    }
});

export default router;
