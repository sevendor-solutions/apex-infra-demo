import { Router } from "express";
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
        const newAgent = await MarketingAgent.create(agentData);
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
