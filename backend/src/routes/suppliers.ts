import { Router } from "express";
import { Supplier } from "../models/Supplier";
import { authenticateToken } from "../middleware/auth";
import { logAuditAction } from "../utils/auditLogger";

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

        if (!name || !contactNumber) {
            return res.status(400).json({ success: false, message: "Supplier name and Contact number are required" });
        }

        const supplier = await Supplier.create({
            name,
            contactNumber,
            address,
            gstNumber,
            openingBalance: parseFloat(openingBalance || 0),
            outstandingAmount: parseFloat(openingBalance || 0)
        });

        await logAuditAction(req, "Create Supplier", `Created supplier account for: ${name}`, "Success", { supplierId: supplier.id });
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

        if (name) supplier.name = name;
        if (contactNumber) supplier.contactNumber = contactNumber;
        if (address !== undefined) supplier.address = address;
        if (gstNumber !== undefined) supplier.gstNumber = gstNumber;
        if (openingBalance !== undefined) supplier.openingBalance = parseFloat(openingBalance);
        if (outstandingAmount !== undefined) supplier.outstandingAmount = parseFloat(outstandingAmount);

        await supplier.save();
        await logAuditAction(req, "Update Supplier", `Updated details for supplier: ${supplier.name}`, "Success", { supplierId: supplier.id });
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
        await logAuditAction(req, "Delete Supplier", `Deleted supplier account: ${supplier.name}`, "Success", { supplierId: supplier.id });
        return res.json({ success: true, message: "Supplier deleted successfully" });
    } catch (error) {
        next(error);
    }
});

export default router;
