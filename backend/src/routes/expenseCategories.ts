import { Router } from "express";
import { ExpenseCategory } from "../models/ExpenseCategory";
import { Expense } from "../models/Expense";
import { authenticateToken } from "../middleware/auth";

const router = Router();

// GET all expense categories
router.get("/", authenticateToken, async (req, res, next) => {
    try {
        const categories = await ExpenseCategory.findAll({ order: [["name", "ASC"]] });
        return res.json({ success: true, data: categories });
    } catch (error) {
        next(error);
    }
});

// POST create expense category
router.post("/", authenticateToken, async (req, res, next) => {
    try {
        const all = await ExpenseCategory.findAll({ attributes: ["id"] });
        let nextNum = 1;
        all.forEach(c => {
            const match = c.id.match(/^ec(\d+)$/);
            if (match) {
                const num = parseInt(match[1], 10);
                if (num >= nextNum) nextNum = num + 1;
            }
        });
        const { id: _id, ...body } = req.body;
        const newCat = await ExpenseCategory.create({ ...body, id: `ec${nextNum}` });
        return res.status(201).json({ success: true, data: newCat });
    } catch (error) {
        next(error);
    }
});

// PUT update expense category (Only unused categories can be updated)
router.put("/:id", authenticateToken, async (req, res, next) => {
    try {
        const cat = await ExpenseCategory.findByPk(req.params.id);
        if (!cat) return res.status(404).json({ success: false, message: "Category not found" });

        const { name } = req.body;
        if (!name || !name.trim()) {
            return res.status(400).json({ success: false, message: "Category name is required" });
        }

        const cleanName = name.trim();

        // Check if category is used in any expense record
        const usedCount = await Expense.count({
            where: {
                expenseCategory: [cat.name, cat.id]
            }
        });

        if (usedCount > 0) {
            return res.status(400).json({ 
                success: false, 
                message: `Category "${cat.name}" is actively used in ${usedCount} expense record(s) and cannot be updated.` 
            });
        }

        // Check duplicate name
        const duplicate = await ExpenseCategory.findOne({ where: { name: cleanName } });
        if (duplicate && duplicate.id !== cat.id) {
            return res.status(400).json({ 
                success: false, 
                message: `Category "${cleanName}" already exists in the master list.` 
            });
        }

        cat.name = cleanName;
        await cat.save();
        return res.json({ success: true, data: cat, message: "Expense category updated successfully" });
    } catch (error) {
        next(error);
    }
});

// DELETE expense category (Only unused categories can be deleted)
router.delete("/:id", authenticateToken, async (req, res, next) => {
    try {
        const cat = await ExpenseCategory.findByPk(req.params.id);
        if (!cat) return res.status(404).json({ success: false, message: "Category not found" });

        // Check if category is used in any expense record
        const usedCount = await Expense.count({
            where: {
                expenseCategory: [cat.name, cat.id]
            }
        });

        if (usedCount > 0) {
            return res.status(400).json({ 
                success: false, 
                message: `Category "${cat.name}" is used in ${usedCount} expense record(s) and cannot be deleted.` 
            });
        }

        await cat.destroy();
        return res.json({ success: true, message: "Category deleted" });
    } catch (error) {
        next(error);
    }
});

export default router;
