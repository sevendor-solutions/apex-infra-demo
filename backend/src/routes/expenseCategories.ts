import { Router } from "express";
import { ExpenseCategory } from "../models/ExpenseCategory";
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

// DELETE expense category
router.delete("/:id", authenticateToken, async (req, res, next) => {
    try {
        const cat = await ExpenseCategory.findByPk(req.params.id);
        if (!cat) return res.status(404).json({ success: false, message: "Category not found" });
        await cat.destroy();
        return res.json({ success: true, message: "Category deleted" });
    } catch (error) {
        next(error);
    }
});

export default router;
