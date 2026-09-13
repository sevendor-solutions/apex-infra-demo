import { Router } from "express";
import { Op } from "sequelize";
import { Supplier } from "../models/Supplier";
import { authenticateToken } from "../middleware/auth";
import { logAuditAction } from "../utils/auditLogger";
import { logAccountingActivity } from "../utils/accountingLogger";

const router = Router();

// GET all suppliers
router.get("/", authenticateToken, async (req, res, next) => {
    try {
        const suppliers = await Supplier.findAll({ order: [["name", "ASC"]] });
        return res.json({ success: true, data: suppliers });
    } catch (error) {
        next(error);
    }
});

// POST create supplier
router.post("/", authenticateToken, async (req, res, next) => {
    try {
        const { name, contactNumber, address, gstNumber, openingBalance } = req.body;

        if (!name) {
            return res.status(400).json({ success: false, message: "Supplier name is required" });
        }

        const trimmedContact = contactNumber ? String(contactNumber).trim() : "";

        // Duplicate check on name or contactNumber
        const orConditions: any[] = [{ name: { [Op.iLike]: name.trim() } }];
        if (trimmedContact && trimmedContact !== "" && trimmedContact !== "N/A") {
            orConditions.push({ contactNumber: trimmedContact });
        }

        const existing = await Supplier.findOne({
            where: {
                [Op.or]: orConditions
            }
        });
        if (existing) {
            const matchesField = (trimmedContact && existing.contactNumber === trimmedContact) ? "contact number" : "name";
            return res.status(400).json({ success: false, message: `A supplier with this ${matchesField} already exists` });
        }

        const supplier = await Supplier.create({
            name,
            contactNumber: trimmedContact || "N/A",
            address,
            gstNumber,
            openingBalance: parseFloat(openingBalance || 0),
            outstandingAmount: parseFloat(openingBalance || 0),
            userId: req.user?.id
        });

        await logAccountingActivity({
            req,
            module: "Suppliers",
            activityType: "INSERT",
            recordId: supplier.name,
            amount: supplier.openingBalance,
            description: `Created Supplier account: ${name} (Phone: ${contactNumber}, Opening Balance: ₹${openingBalance || 0})`
        });
        return res.status(201).json({ success: true, data: supplier });
    } catch (error) {
        next(error);
    }
});

// PUT update supplier
router.put("/:id", authenticateToken, async (req, res, next) => {
    try {
        const supplier = await Supplier.findByPk(req.params.id);
        if (!supplier) return res.status(404).json({ success: false, message: "Supplier not found" });

        const { name, contactNumber, address, gstNumber, openingBalance, outstandingAmount } = req.body;

        // Duplicate check on name or contactNumber (exclude current)
        const checkFields: any[] = [];
        if (name && name.trim().toLowerCase() !== supplier.name.toLowerCase()) {
            checkFields.push({ name: { [Op.iLike]: name.trim() } });
        }
        if (contactNumber && contactNumber.trim() !== supplier.contactNumber) {
            checkFields.push({ contactNumber: contactNumber.trim() });
        }

        if (checkFields.length > 0) {
            const existing = await Supplier.findOne({
                where: {
                    id: { [Op.ne]: supplier.id },
                    [Op.or]: checkFields
                }
            });
            if (existing) {
                const matchesField = contactNumber && existing.contactNumber === contactNumber.trim() ? "contact number" : "name";
                return res.status(400).json({ success: false, message: `Another supplier with this ${matchesField} already exists` });
            }
        }

        if (name) supplier.name = name;
        if (contactNumber) supplier.contactNumber = contactNumber;
        if (address !== undefined) supplier.address = address;
        if (gstNumber !== undefined) supplier.gstNumber = gstNumber;
        if (openingBalance !== undefined) supplier.openingBalance = parseFloat(openingBalance);
        if (outstandingAmount !== undefined) supplier.outstandingAmount = parseFloat(outstandingAmount);

        await supplier.save();
        await logAccountingActivity({
            req,
            module: "Suppliers",
            activityType: "UPDATE",
            recordId: supplier.name,
            amount: supplier.outstandingAmount,
            description: `Updated Supplier account: ${supplier.name} (Outstanding: ₹${supplier.outstandingAmount})`
        });
        return res.json({ success: true, data: supplier });
    } catch (error) {
        next(error);
    }
});

// DELETE supplier
router.delete("/:id", authenticateToken, async (req, res, next) => {
    try {
        const supplier = await Supplier.findByPk(req.params.id);
        if (!supplier) return res.status(404).json({ success: false, message: "Supplier not found" });

        await supplier.destroy();
        await logAccountingActivity({
            req,
            module: "Suppliers",
            activityType: "DELETE",
            recordId: supplier.name,
            amount: supplier.outstandingAmount,
            description: `Deleted Supplier account: ${supplier.name} (Outstanding was: ₹${supplier.outstandingAmount})`
        });
        return res.json({ success: true, message: "Supplier deleted successfully" });
    } catch (error) {
        next(error);
    }
});

export default router;
