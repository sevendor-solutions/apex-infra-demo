import { Router } from "express";
import { Op } from "sequelize";
import { City } from "../models/City";
import { LocationMaster } from "../models/LocationMaster";
import { PropertyType } from "../models/PropertyType";
import { Facing } from "../models/Facing";
import { Amenity } from "../models/Amenity";
import { authenticateToken } from "../middleware/auth";

const router = Router();

// --- Cities ---

// GET all cities
router.get("/cities", async (req, res, next) => {
    try {
        const cities = await City.findAll({
            order: [["createdAt", "DESC"]]
        });
        return res.json({ success: true, data: cities });
    } catch (error) {
        next(error);
    }
});

// POST create city
router.post("/cities", authenticateToken, async (req, res, next) => {
    try {
        const { name } = req.body;
        if (!name || !name.trim()) {
            return res.status(400).json({ success: false, message: "City name is required" });
        }
        
        const existing = await City.findOne({
            where: { name: { [Op.iLike]: name.trim() } }
        });
        if (existing) {
            return res.status(400).json({ success: false, message: `City "${name}" already exists` });
        }

        const city = await City.create({ ...req.body, userId: req.user?.id });
        return res.status(201).json({ success: true, data: city });
    } catch (error) {
        next(error);
    }
});

// DELETE city
router.delete("/cities/:id", authenticateToken, async (req, res, next) => {
    try {
        const city = await City.findByPk(req.params.id);
        if (!city) {
            return res.status(404).json({ success: false, message: "City not found" });
        }
        await city.destroy();
        return res.json({ success: true, message: "City deleted successfully" });
    } catch (error) {
        next(error);
    }
});


// --- Locations ---

// GET all locations (supports optional cityId filter)
router.get("/locations", async (req, res, next) => {
    try {
        const { cityId } = req.query;
        const whereClause: any = {};
        if (cityId) {
            whereClause.cityId = cityId;
        }

        const locations = await LocationMaster.findAll({
            where: whereClause,
            include: [{ model: City, required: false }],
            order: [["createdAt", "DESC"]]
        });
        return res.json({ success: true, data: locations });
    } catch (error) {
        next(error);
    }
});

// POST create location
router.post("/locations", authenticateToken, async (req, res, next) => {
    try {
        const { name, cityId } = req.body;
        if (!name || !name.trim() || !cityId) {
            return res.status(400).json({ success: false, message: "Location name and City ID are required" });
        }

        const existing = await LocationMaster.findOne({
            where: {
                name: { [Op.iLike]: name.trim() },
                cityId
            }
        });
        if (existing) {
            return res.status(400).json({ success: false, message: `Location "${name}" already exists in this city` });
        }

        const location = await LocationMaster.create({ ...req.body, userId: req.user?.id });
        return res.status(201).json({ success: true, data: location });
    } catch (error) {
        next(error);
    }
});

// DELETE location
router.delete("/locations/:id", authenticateToken, async (req, res, next) => {
    try {
        const location = await LocationMaster.findByPk(req.params.id);
        if (!location) {
            return res.status(404).json({ success: false, message: "Location not found" });
        }
        await location.destroy();
        return res.json({ success: true, message: "Location deleted successfully" });
    } catch (error) {
        next(error);
    }
});


// --- Property Types ---

// GET all property types
router.get("/property-types", async (req, res, next) => {
    try {
        const types = await PropertyType.findAll({
            order: [["createdAt", "DESC"]]
        });
        return res.json({ success: true, data: types });
    } catch (error) {
        next(error);
    }
});

// POST create property type
router.post("/property-types", authenticateToken, async (req, res, next) => {
    try {
        const { name } = req.body;
        if (!name || !name.trim()) {
            return res.status(400).json({ success: false, message: "Property Type name is required" });
        }

        const existing = await PropertyType.findOne({
            where: { name: { [Op.iLike]: name.trim() } }
        });
        if (existing) {
            return res.status(400).json({ success: false, message: `Property Type "${name}" already exists` });
        }

        const type = await PropertyType.create({ ...req.body, userId: req.user?.id });
        return res.status(201).json({ success: true, data: type });
    } catch (error) {
        next(error);
    }
});

// DELETE property type
router.delete("/property-types/:id", authenticateToken, async (req, res, next) => {
    try {
        const type = await PropertyType.findByPk(req.params.id);
        if (!type) {
            return res.status(404).json({ success: false, message: "Property Type not found" });
        }
        await type.destroy();
        return res.json({ success: true, message: "Property Type deleted successfully" });
    } catch (error) {
        next(error);
    }
});


// --- Facings ---

// GET all facings
router.get("/facings", async (req, res, next) => {
    try {
        const facings = await Facing.findAll({
            order: [["createdAt", "DESC"]]
        });
        return res.json({ success: true, data: facings });
    } catch (error) {
        next(error);
    }
});

// POST create facing
router.post("/facings", authenticateToken, async (req, res, next) => {
    try {
        const { name } = req.body;
        if (!name || !name.trim()) {
            return res.status(400).json({ success: false, message: "Facing direction name is required" });
        }

        const existing = await Facing.findOne({
            where: { name: { [Op.iLike]: name.trim() } }
        });
        if (existing) {
            return res.status(400).json({ success: false, message: `Facing direction "${name}" already exists` });
        }

        const facing = await Facing.create({ ...req.body, userId: req.user?.id });
        return res.status(201).json({ success: true, data: facing });
    } catch (error) {
        next(error);
    }
});

// DELETE facing
router.delete("/facings/:id", authenticateToken, async (req, res, next) => {
    try {
        const facing = await Facing.findByPk(req.params.id);
        if (!facing) {
            return res.status(404).json({ success: false, message: "Facing not found" });
        }
        await facing.destroy();
        return res.json({ success: true, message: "Facing deleted successfully" });
    } catch (error) {
        next(error);
    }
});


// --- Amenities ---

// GET all amenities
router.get("/amenities", async (req, res, next) => {
    try {
        const amenities = await Amenity.findAll({
            order: [["createdAt", "DESC"]]
        });
        return res.json({ success: true, data: amenities });
    } catch (error) {
        next(error);
    }
});

// POST create amenity
router.post("/amenities", authenticateToken, async (req, res, next) => {
    try {
        const { name } = req.body;
        if (!name || !name.trim()) {
            return res.status(400).json({ success: false, message: "Amenity name is required" });
        }

        const existing = await Amenity.findOne({
            where: { name: { [Op.iLike]: name.trim() } }
        });
        if (existing) {
            return res.status(400).json({ success: false, message: `Amenity "${name}" already exists` });
        }

        const amenity = await Amenity.create({ ...req.body, userId: req.user?.id });
        return res.status(201).json({ success: true, data: amenity });
    } catch (error) {
        next(error);
    }
});

// DELETE amenity
router.delete("/amenities/:id", authenticateToken, async (req, res, next) => {
    try {
        const amenity = await Amenity.findByPk(req.params.id);
        if (!amenity) {
            return res.status(404).json({ success: false, message: "Amenity not found" });
        }
        await amenity.destroy();
        return res.json({ success: true, message: "Amenity deleted successfully" });
    } catch (error) {
        next(error);
    }
});

export default router;
