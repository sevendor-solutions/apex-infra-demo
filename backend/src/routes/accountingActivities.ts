import { Router } from "express";
import { Op } from "sequelize";
import { AccountingActivity } from "../models/AccountingActivity";
import { authenticateToken } from "../middleware/auth";
import { runSchemaMigrations } from "../utils/schemaMigration";

const router = Router();

router.use(authenticateToken);

// GET /api/accounting-activities
router.get("/", async (req, res, next) => {
    const fetchActivities = async () => {
        const { startDate, endDate, module, activityType, search, limit } = req.query;

        const whereClause: any = {};

        // Date range filter
        if (startDate && endDate) {
            const start = new Date(`${startDate}T00:00:00.000Z`);
            const end = new Date(`${endDate}T23:59:59.999Z`);
            whereClause.dateTime = {
                [Op.between]: [start, end]
            };
        } else if (startDate) {
            whereClause.dateTime = {
                [Op.gte]: new Date(`${startDate}T00:00:00.000Z`)
            };
        } else if (endDate) {
            whereClause.dateTime = {
                [Op.lte]: new Date(`${endDate}T23:59:59.999Z`)
            };
        }

        // Module filter
        if (module && typeof module === "string" && module !== "all") {
            whereClause.module = module;
        }

        // Activity Type filter (INSERT | UPDATE | DELETE)
        if (activityType && typeof activityType === "string" && activityType !== "all") {
            whereClause.activityType = activityType.toUpperCase();
        }

        // Keyword search
        if (search && typeof search === "string" && search.trim()) {
            const s = `%${search.trim()}%`;
            whereClause[Op.or] = [
                { recordId: { [Op.iLike]: s } },
                { description: { [Op.iLike]: s } },
                { userName: { [Op.iLike]: s } },
                { module: { [Op.iLike]: s } }
            ];
        }

        const maxLimit = limit ? Math.min(parseInt(limit as string, 10), 2000) : 1000;

        return await AccountingActivity.findAll({
            where: whereClause,
            order: [["dateTime", "DESC"], ["createdAt", "DESC"]],
            limit: maxLimit
        });
    };

    try {
        const activities = await fetchActivities();
        return res.json({ success: true, data: activities });
    } catch (error: any) {
        if (error?.message?.includes("does not exist") || error?.parent?.message?.includes("does not exist")) {
            console.warn("⚠️ accounting_activities table or column missing, auto-healing schema...");
            try {
                await runSchemaMigrations(true);
                const retryActivities = await fetchActivities();
                return res.json({ success: true, data: retryActivities });
            } catch (retryErr) {
                return next(retryErr);
            }
        }
        next(error);
    }
});

export default router;
