import { Router } from "express";
import { GalleryItem } from "../models/GalleryItem";
import { authenticateToken } from "../middleware/auth";

const router = Router();

// GET all gallery items
router.get("/", async (req, res, next) => {
    try {
        const { category } = req.query;
        const whereClause: any = {};
        if (category) {
            whereClause.category = category;
        }

        const items = await GalleryItem.findAll({
            where: whereClause,
            order: [["createdAt", "DESC"]]
        });
        return res.json({ success: true, data: items });
    } catch (error) {
        next(error);
    }
});

// POST create gallery item
router.post("/", authenticateToken, async (req, res, next) => {
    try {
        const newItem = await GalleryItem.create(req.body);
        return res.status(201).json({ success: true, data: newItem });
    } catch (error) {
        next(error);
    }
});

// DELETE gallery item
router.delete("/:id", authenticateToken, async (req, res, next) => {
    try {
        const item = await GalleryItem.findByPk(req.params.id);
        if (!item) {
            return res.status(404).json({ success: false, message: "Gallery item not found" });
        }
        await item.destroy();
        return res.json({ success: true, message: "Gallery item deleted successfully" });
    } catch (error) {
        next(error);
    }
});

// PUT update gallery item
router.put("/:id", authenticateToken, async (req, res, next) => {
    try {
        const item = await GalleryItem.findByPk(req.params.id);
        if (!item) {
            return res.status(404).json({ success: false, message: "Gallery item not found" });
        }
        await item.update(req.body);
        return res.json({ success: true, data: item });
    } catch (error) {
        next(error);
    }
});

export default router;
