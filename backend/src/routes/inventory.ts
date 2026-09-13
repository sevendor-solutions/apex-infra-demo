import { Router } from "express";
import { Op } from "sequelize";
import { InventoryItem } from "../models/InventoryItem";
import { StockMovement } from "../models/StockMovement";
import { authenticateToken } from "../middleware/auth";
import { logAuditAction } from "../utils/auditLogger";
import { logAccountingActivity } from "../utils/accountingLogger";

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
        const { 
            name, code, category, brand, unit, openingStock, purchasePrice, sellingPrice, gstPercentage, minimumStockLevel, supplierName, warehouseLocation,
            type, hsn, image, batchTracking, sellingPriceTaxType, purchasePriceTaxType, batches
        } = req.body;

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
            type: type || "Product",
            hsn,
            image,
            batchTracking: !!batchTracking,
            sellingPriceTaxType: sellingPriceTaxType || "Without Tax",
            purchasePriceTaxType: purchasePriceTaxType || "Without Tax",
            batches: batches || [],
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

        await logAccountingActivity({
            req,
            module: "Inventory",
            activityType: "INSERT",
            recordId: item.code,
            amount: (openingStock || 0) * (purchasePrice || 0),
            description: `Created Inventory Item: ${name} (${code}) - Stock: ${openingStock || 0} ${unit || 'Pcs'}, Price: ₹${purchasePrice || 0}`
        });
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

        const { 
            name, category, brand, unit, purchasePrice, sellingPrice, gstPercentage, minimumStockLevel, supplierName, warehouseLocation,
            type, hsn, image, batchTracking, sellingPriceTaxType, purchasePriceTaxType, batches, currentStock
        } = req.body;

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
        if (type !== undefined) item.type = type;
        if (hsn !== undefined) item.hsn = hsn;
        if (image !== undefined) item.image = image;
        if (batchTracking !== undefined) item.batchTracking = !!batchTracking;
        if (sellingPriceTaxType !== undefined) item.sellingPriceTaxType = sellingPriceTaxType;
        if (purchasePriceTaxType !== undefined) item.purchasePriceTaxType = purchasePriceTaxType;
        if (batches !== undefined) item.batches = batches;
        if (currentStock !== undefined) item.currentStock = currentStock;

        await item.save();
        await logAccountingActivity({
            req,
            module: "Inventory",
            activityType: "UPDATE",
            recordId: item.code,
            amount: (item.currentStock || 0) * (item.purchasePrice || 0),
            description: `Updated Inventory Item: ${item.name} (${item.code}) - Stock: ${item.currentStock}, Price: ₹${item.purchasePrice}`
        });
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
        await logAccountingActivity({
            req,
            module: "Inventory",
            activityType: "DELETE",
            recordId: item.code,
            amount: (item.currentStock || 0) * (item.purchasePrice || 0),
            description: `Deleted Inventory Item: ${item.name} (${item.code})`
        });
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

        await logAccountingActivity({
            req,
            module: "Inventory",
            activityType: "INSERT",
            recordId: item.code,
            amount: parseFloat(quantity) * (item.purchasePrice || 0),
            description: `Stock In: Added ${quantity} ${item.unit} for ${item.name} (${item.code})`
        });
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

        await logAccountingActivity({
            req,
            module: "Inventory",
            activityType: "INSERT",
            recordId: item.code,
            amount: parseFloat(quantity) * (item.sellingPrice || 0),
            description: `Stock Out: Deducted ${quantity} ${item.unit} for ${item.name} (${item.code})`
        });
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

        await logAccountingActivity({
            req,
            module: "Inventory",
            activityType: "UPDATE",
            recordId: item.code,
            amount: parseFloat(quantity) * (item.purchasePrice || 0),
            description: `Stock Adjustment: Adjusted stock of ${item.name} (${item.code}) to ${quantity} ${item.unit}`
        });
        return res.status(201).json({ success: true, data: movement, item });
    } catch (error) {
        next(error);
    }
});

export default router;
