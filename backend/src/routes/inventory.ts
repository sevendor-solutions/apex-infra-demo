import { Router } from "express";
import { Op } from "sequelize";
import { InventoryItem } from "../models/InventoryItem";
import { StockMovement } from "../models/StockMovement";
import { authenticateToken } from "../middleware/auth";
import { logAuditAction } from "../utils/auditLogger";

const router = Router();

// GET all inventory items
router.get("/", authenticateToken, async (req, res, next) => {
    try {
        const items = await InventoryItem.findAll({ order: [["name", "ASC"]] });
        return res.json({ success: true, data: items });
    } catch (error) {
        next(error);
    }
});

// POST create new inventory item
router.post("/", authenticateToken, async (req, res, next) => {
    try {
        const { name, code, category, brand, unit, openingStock, purchasePrice, sellingPrice, gstPercentage, minimumStockLevel, supplierName, warehouseLocation } = req.body;

        if (!name || !code) {
            return res.status(400).json({ success: false, message: "Name and Unique Code are required" });
        }

        // Check uniqueness of code AND name
        const codeExists = await InventoryItem.findOne({ where: { code } });
        if (codeExists) {
            return res.status(400).json({ success: false, message: `Product code "${code}" already exists` });
        }
        const nameExists = await InventoryItem.findOne({ where: { name: { [Op.iLike]: name.trim() } } });
        if (nameExists) {
            return res.status(400).json({ success: false, message: `A product with name "${name}" already exists (Code: ${nameExists.code})` });
        }

        const item = await InventoryItem.create({
            name,
            code,
            category,
            brand,
            unit: unit || "Pcs",
            openingStock: openingStock || 0,
            purchasePrice: purchasePrice || 0,
            sellingPrice: sellingPrice || 0,
            gstPercentage: gstPercentage || 0,
            currentStock: openingStock || 0,
            minimumStockLevel: minimumStockLevel || 0,
            supplierName,
            warehouseLocation,
            userId: req.user?.id
        });

        // Record opening stock as initial Stock In movement if > 0
        if (openingStock > 0) {
            await StockMovement.create({
                productCode: code,
                type: "Stock In",
                quantity: openingStock,
                date: new Date().toISOString().split("T")[0],
                warehouse: warehouseLocation || "Main Warehouse",
                notes: "Opening Stock Initial Seeding",
                userId: req.user?.id
            });
        }

        await logAuditAction(req, "Create Product", `Created product: ${name} (${code})`, "Success", { itemId: item.id });
        return res.status(201).json({ success: true, data: item });
    } catch (error) {
        next(error);
    }
});

// PUT update inventory item
router.put("/:id", authenticateToken, async (req, res, next) => {
    try {
        const item = await InventoryItem.findByPk(req.params.id);
        if (!item) return res.status(404).json({ success: false, message: "Product not found" });

        const { name, category, brand, unit, purchasePrice, sellingPrice, gstPercentage, minimumStockLevel, supplierName, warehouseLocation } = req.body;

        // Duplicate check on name (exclude current)
        if (name && name.trim().toLowerCase() !== item.name.toLowerCase()) {
            const nameExists = await InventoryItem.findOne({
                where: {
                    id: { [Op.ne]: item.id },
                    name: { [Op.iLike]: name.trim() }
                }
            });
            if (nameExists) {
                return res.status(400).json({ success: false, message: `Another product with name "${name}" already exists (Code: ${nameExists.code})` });
            }
        }

        if (name) item.name = name;
        if (category !== undefined) item.category = category;
        if (brand !== undefined) item.brand = brand;
        if (unit) item.unit = unit;
        if (purchasePrice !== undefined) item.purchasePrice = purchasePrice;
        if (sellingPrice !== undefined) item.sellingPrice = sellingPrice;
        if (gstPercentage !== undefined) item.gstPercentage = gstPercentage;
        if (minimumStockLevel !== undefined) item.minimumStockLevel = minimumStockLevel;
        if (supplierName !== undefined) item.supplierName = supplierName;
        if (warehouseLocation !== undefined) item.warehouseLocation = warehouseLocation;

        await item.save();
        await logAuditAction(req, "Update Product", `Updated details for: ${item.name} (${item.code})`, "Success", { itemId: item.id });
        return res.json({ success: true, data: item });
    } catch (error) {
        next(error);
    }
});

// DELETE inventory item
router.delete("/:id", authenticateToken, async (req, res, next) => {
    try {
        const item = await InventoryItem.findByPk(req.params.id);
        if (!item) return res.status(404).json({ success: false, message: "Product not found" });

        await item.destroy();
        await logAuditAction(req, "Delete Product", `Deleted product: ${item.name} (${item.code})`, "Success", { itemId: item.id });
        return res.json({ success: true, message: "Product deleted successfully" });
    } catch (error) {
        next(error);
    }
});

// GET all stock movements
router.get("/movements", authenticateToken, async (req, res, next) => {
    try {
        const movements = await StockMovement.findAll({ order: [["date", "DESC"], ["createdAt", "DESC"]] });
        return res.json({ success: true, data: movements });
    } catch (error) {
        next(error);
    }
});

// POST stock-in
router.post("/stock-in", authenticateToken, async (req, res, next) => {
    try {
        const { productCode, quantity, date, warehouse, notes } = req.body;
        if (!productCode || !quantity || !date) {
            return res.status(400).json({ success: false, message: "Required fields missing" });
        }

        const item = await InventoryItem.findOne({ where: { code: productCode } });
        if (!item) return res.status(404).json({ success: false, message: "Product not found" });

        item.currentStock += parseFloat(quantity);
        await item.save();

        const movement = await StockMovement.create({
            productCode,
            type: "Stock In",
            quantity: parseFloat(quantity),
            date,
            warehouse: warehouse || item.warehouseLocation,
            notes,
            userId: req.user?.id
        });

        await logAuditAction(req, "Stock In", `Added stock of ${quantity} for ${item.name}`, "Success", { movementId: movement.id });
        return res.status(201).json({ success: true, data: movement, item });
    } catch (error) {
        next(error);
    }
});

// POST stock-out
router.post("/stock-out", authenticateToken, async (req, res, next) => {
    try {
        const { productCode, quantity, date, warehouse, notes } = req.body;
        if (!productCode || !quantity || !date) {
            return res.status(400).json({ success: false, message: "Required fields missing" });
        }

        const item = await InventoryItem.findOne({ where: { code: productCode } });
        if (!item) return res.status(404).json({ success: false, message: "Product not found" });

        item.currentStock -= parseFloat(quantity);
        await item.save();

        const movement = await StockMovement.create({
            productCode,
            type: "Stock Out",
            quantity: parseFloat(quantity),
            date,
            warehouse: warehouse || item.warehouseLocation,
            notes,
            userId: req.user?.id
        });

        await logAuditAction(req, "Stock Out", `Removed stock of ${quantity} for ${item.name}`, "Success", { movementId: movement.id });
        return res.status(201).json({ success: true, data: movement, item });
    } catch (error) {
        next(error);
    }
});

// POST adjust stock
router.post("/adjust", authenticateToken, async (req, res, next) => {
    try {
        const { productCode, quantity, date, notes } = req.body;
        if (!productCode || quantity === undefined || !date) {
            return res.status(400).json({ success: false, message: "Required fields missing" });
        }

        const item = await InventoryItem.findOne({ where: { code: productCode } });
        if (!item) return res.status(404).json({ success: false, message: "Product not found" });

        item.currentStock = parseFloat(quantity);
        await item.save();

        const movement = await StockMovement.create({
            productCode,
            type: "Adjustment",
            quantity: parseFloat(quantity),
            date,
            warehouse: item.warehouseLocation || "Main Warehouse",
            notes: notes || "Manual stock override adjustment",
            userId: req.user?.id
        });

        await logAuditAction(req, "Stock Adjustment", `Adjusted stock of ${item.name} to ${quantity}`, "Success", { movementId: movement.id });
        return res.status(201).json({ success: true, data: movement, item });
    } catch (error) {
        next(error);
    }
});

export default router;
