import { Router } from "express";
import { Op } from "sequelize";
import { MarketingAgent } from "../models/MarketingAgent";
import { authenticateToken } from "../middleware/auth";

const router = Router();

// GET all marketing agents
router.get("/", async (req, res, next) => {
    try {
        const agents = await MarketingAgent.findAll({
            order: [["name", "ASC"]]
        });
        return res.json({ success: true, data: agents });
    } catch (error) {
        next(error);
    }
});

// GET marketing agent by ID
router.get("/:id", async (req, res, next) => {
    try {
        const agent = await MarketingAgent.findByPk(req.params.id);
        if (!agent) {
            return res.status(404).json({ success: false, message: "Marketing agent not found" });
        }
        return res.json({ success: true, data: agent });
    } catch (error) {
        next(error);
    }
});

// POST create marketing agent
router.post("/", authenticateToken, async (req, res, next) => {
    try {
        // Strip null/undefined id — let the @BeforeValidate hook auto-generate it
        const { id, ...agentData } = req.body;
        const { name, phone } = agentData;

        if (!name || !name.trim()) {
            return res.status(400).json({ success: false, message: "Agent full name is required" });
        }

        // Duplicate check on name or phone
        const checkFields: any[] = [{ name: { [Op.iLike]: name.trim() } }];
        if (phone && phone.trim()) {
            checkFields.push({ phone: phone.trim() });
        }
        const existing = await MarketingAgent.findOne({ where: { [Op.or]: checkFields } });
        if (existing) {
            const matchesField = phone && existing.phone === phone.trim() ? "phone number" : "name";
            return res.status(400).json({ success: false, message: `A marketing agent with this ${matchesField} already exists` });
        }

        const newAgent = await MarketingAgent.create({ ...agentData, userId: req.user?.id });
        return res.status(201).json({ success: true, data: newAgent });
    } catch (error) {
        next(error);
    }
});

// PUT update marketing agent
router.put("/:id", authenticateToken, async (req, res, next) => {
    try {
        const agent = await MarketingAgent.findByPk(req.params.id);
        if (!agent) {
            return res.status(404).json({ success: false, message: "Marketing agent not found" });
        }

        const { name, phone } = req.body;

        // Duplicate check on name/phone (exclude current)
        const checkFields: any[] = [];
        if (name && name.trim().toLowerCase() !== agent.name.toLowerCase()) {
            checkFields.push({ name: { [Op.iLike]: name.trim() } });
        }
        if (phone && phone.trim() !== agent.phone) {
            checkFields.push({ phone: phone.trim() });
        }
        if (checkFields.length > 0) {
            const existing = await MarketingAgent.findOne({
                where: { id: { [Op.ne]: agent.id }, [Op.or]: checkFields }
            });
            if (existing) {
                const matchesField = phone && existing.phone === phone.trim() ? "phone number" : "name";
                return res.status(400).json({ success: false, message: `Another marketing agent with this ${matchesField} already exists` });
            }
        }

        await agent.update(req.body);
        return res.json({ success: true, data: agent });
    } catch (error) {
        next(error);
    }
});

// DELETE marketing agent
router.delete("/:id", authenticateToken, async (req, res, next) => {
    try {
        const agent = await MarketingAgent.findByPk(req.params.id);
        if (!agent) {
            return res.status(404).json({ success: false, message: "Marketing agent not found" });
        }
        await agent.destroy();
        return res.json({ success: true, message: "Marketing agent deleted successfully" });
    } catch (error) {
        next(error);
    }
});

export default router;
