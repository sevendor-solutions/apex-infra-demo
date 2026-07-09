import { Router } from "express";
import { Enquiry } from "../models/Enquiry";
import { authenticateToken } from "../middleware/auth";

const router = Router();

// GET all enquiries
router.get("/", authenticateToken, async (req, res, next) => {
    try {
        const enquiries = await Enquiry.findAll({
            order: [["date", "DESC"]]
        });
        return res.json({ success: true, data: enquiries });
    } catch (error) {
        next(error);
    }
});

// POST submit a new enquiry
router.post("/", async (req, res, next) => {
    try {
        const newEnquiry = await Enquiry.create(req.body);
        return res.status(201).json({ success: true, data: newEnquiry });
    } catch (error) {
        next(error);
    }
});

// PUT update enquiry status and/or notes
router.put("/:id", authenticateToken, async (req, res, next) => {
    try {
        const enquiry = await Enquiry.findByPk(req.params.id);
        if (!enquiry) {
            return res.status(404).json({ success: false, message: "Enquiry not found" });
        }
        await enquiry.update(req.body);
        return res.json({ success: true, data: enquiry });
    } catch (error) {
        next(error);
    }
});

// DELETE enquiry
router.delete("/:id", authenticateToken, async (req, res, next) => {
    try {
        const enquiry = await Enquiry.findByPk(req.params.id);
        if (!enquiry) {
            return res.status(404).json({ success: false, message: "Enquiry not found" });
        }
        await enquiry.destroy();
        return res.json({ success: true, message: "Enquiry deleted successfully" });
    } catch (error) {
        next(error);
    }
});

export default router;
