import { Router } from "express";
import { Document } from "../models/Document";
import { authenticateToken } from "../middleware/auth";
import { logAuditAction } from "../utils/auditLogger";

const router = Router();

// GET all documents
router.get("/", async (req, res, next) => {
    try {
        const { category, projectAssociation } = req.query;
        const whereClause: any = {};

        if (category) {
            whereClause.category = category;
        }
        if (projectAssociation) {
            whereClause.projectAssociation = projectAssociation;
        }

        const docs = await Document.findAll({
            where: whereClause,
            order: [["createdAt", "DESC"]]
        });
        return res.json({ success: true, data: docs });
    } catch (error) {
        next(error);
    }
});

// GET single document by ID
router.get("/:id", async (req, res, next) => {
    try {
        const doc = await Document.findByPk(req.params.id);
        if (!doc) {
            return res.status(404).json({ success: false, message: "Document not found" });
        }
        return res.json({ success: true, data: doc });
    } catch (error) {
        next(error);
    }
});

// POST create document
router.post("/", authenticateToken, async (req, res, next) => {
    try {
        const newDoc = await Document.create(req.body);
        await logAuditAction(req, "Document Uploaded", `Uploaded document: "${newDoc.title}" (Category: ${newDoc.category})`, "Success");
        return res.status(201).json({ success: true, data: newDoc });
    } catch (error) {
        next(error);
    }
});

// PUT update document
router.put("/:id", authenticateToken, async (req, res, next) => {
    try {
        const doc = await Document.findByPk(req.params.id);
        if (!doc) {
            return res.status(404).json({ success: false, message: "Document not found" });
        }
        await doc.update(req.body);
        await logAuditAction(req, "Document Updated", `Updated document: "${doc.title}" (Category: ${doc.category})`, "Success");
        return res.json({ success: true, data: doc });
    } catch (error) {
        next(error);
    }
});

// DELETE document
router.delete("/:id", authenticateToken, async (req, res, next) => {
    try {
        const doc = await Document.findByPk(req.params.id);
        if (!doc) {
            return res.status(404).json({ success: false, message: "Document not found" });
        }
        const title = doc.title;
        const category = doc.category;
        await doc.destroy();
        await logAuditAction(req, "Document Deleted", `Deleted document: "${title}" (Category: ${category})`, "Success");
        return res.json({ success: true, message: "Document deleted successfully" });
    } catch (error) {
        next(error);
    }
});

export default router;
