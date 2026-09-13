import { Router } from "express";
import { Op } from "sequelize";
import { Customer } from "../models/Customer";
import { authenticateToken } from "../middleware/auth";
import { logAuditAction } from "../utils/auditLogger";
import { logAccountingActivity } from "../utils/accountingLogger";

const router = Router();

// GET all customers
router.get("/", authenticateToken, async (req, res, next) => {
    try {
        const customers = await Customer.findAll({ order: [["name", "ASC"]] });
        return res.json({ success: true, data: customers });
    } catch (error) {
        next(error);
    }
});

// POST create customer
router.post("/", authenticateToken, async (req, res, next) => {
    try {
        const { name, mobile, email, address, gstNumber, creditLimit, openingBalance } = req.body;

        if (!name || !mobile) {
            return res.status(400).json({ success: false, message: "Name and Mobile number are required" });
        }

        // Duplicate check on mobile and email
        const whereClause: any[] = [{ mobile: mobile.trim() }];
        if (email && email.trim()) {
            whereClause.push({ email: { [Op.iLike]: email.trim() } });
        }

        const existing = await Customer.findOne({
            where: {
                [Op.or]: whereClause
            }
        });
        if (existing) {
            const matchesField = existing.mobile === mobile.trim() ? "mobile number" : "email address";
            return res.status(400).json({ success: false, message: `A customer with this ${matchesField} already exists` });
        }

        const customer = await Customer.create({
            name,
            mobile,
            email,
            address,
            gstNumber,
            creditLimit: parseFloat(creditLimit || 0),
            openingBalance: parseFloat(openingBalance || 0),
            outstandingAmount: parseFloat(openingBalance || 0)
        });

        await logAccountingActivity({
            req,
            module: "Customers",
            activityType: "INSERT",
            recordId: customer.name,
            amount: customer.openingBalance,
            description: `Created Customer account: ${name} (Mobile: ${mobile}, Opening Balance: ₹${openingBalance || 0})`
        });
        return res.status(201).json({ success: true, data: customer });
    } catch (error) {
        next(error);
    }
});

// PUT update customer
router.put("/:id", authenticateToken, async (req, res, next) => {
    try {
        const customer = await Customer.findByPk(req.params.id);
        if (!customer) return res.status(404).json({ success: false, message: "Customer not found" });

        const { name, mobile, email, address, gstNumber, creditLimit, openingBalance, outstandingAmount } = req.body;

        // Duplicate check on mobile and email (exclude current)
        const checkFields: any[] = [];
        if (mobile && mobile.trim() !== customer.mobile) {
            checkFields.push({ mobile: mobile.trim() });
        }
        if (email && email.trim() && (!customer.email || email.trim().toLowerCase() !== customer.email.toLowerCase())) {
            checkFields.push({ email: { [Op.iLike]: email.trim() } });
        }

        if (checkFields.length > 0) {
            const existing = await Customer.findOne({
                where: {
                    id: { [Op.ne]: customer.id },
                    [Op.or]: checkFields
                }
            });
            if (existing) {
                const matchesField = mobile && existing.mobile === mobile.trim() ? "mobile number" : "email address";
                return res.status(400).json({ success: false, message: `Another customer with this ${matchesField} already exists` });
            }
        }

        if (name) customer.name = name;
        if (mobile) customer.mobile = mobile;
        if (email !== undefined) customer.email = email;
        if (address !== undefined) customer.address = address;
        if (gstNumber !== undefined) customer.gstNumber = gstNumber;
        if (creditLimit !== undefined) customer.creditLimit = parseFloat(creditLimit);
        if (openingBalance !== undefined) customer.openingBalance = parseFloat(openingBalance);
        if (outstandingAmount !== undefined) customer.outstandingAmount = parseFloat(outstandingAmount);

        await customer.save();
        await logAccountingActivity({
            req,
            module: "Customers",
            activityType: "UPDATE",
            recordId: customer.name,
            amount: customer.outstandingAmount,
            description: `Updated Customer account: ${customer.name} (Outstanding: ₹${customer.outstandingAmount})`
        });
        return res.json({ success: true, data: customer });
    } catch (error) {
        next(error);
    }
});

// DELETE customer
router.delete("/:id", authenticateToken, async (req, res, next) => {
    try {
        const customer = await Customer.findByPk(req.params.id);
        if (!customer) return res.status(404).json({ success: false, message: "Customer not found" });

        await customer.destroy();
        await logAccountingActivity({
            req,
            module: "Customers",
            activityType: "DELETE",
            recordId: customer.name,
            amount: customer.outstandingAmount,
            description: `Deleted Customer account: ${customer.name} (Outstanding was: ₹${customer.outstandingAmount})`
        });
        return res.json({ success: true, message: "Customer deleted successfully" });
    } catch (error) {
        next(error);
    }
});

export default router;
