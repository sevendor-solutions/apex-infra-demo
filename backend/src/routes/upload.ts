import { Router, Request, Response, NextFunction } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";

const router = Router();

// Map module codes to subfolders
const getSubFolder = (moduleCode?: string): string => {
    switch (moduleCode) {
        case "MP":
            return "properties";
        case "MMS":
            return "marketing";
        case "MVA":
            return "marketing_visual_assets";
        case "PVA":
            return "project_visual_assets";
        case "MBN":
            return "blogs";
        default:
            return "others";
    }
};

// Configure disk storage for Multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const moduleCode = (req.query.module as string) || "others";
        const subFolder = getSubFolder(moduleCode);
        const uploadPath = path.join(__dirname, "../../uploads", subFolder);
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const moduleCode = (req.query.module as string) || "others";
        const originalName = file.originalname;
        const ext = path.extname(originalName);
        const nameWithoutExt = path.basename(originalName, ext);
        
        // Clean special characters from the original name
        const cleanName = nameWithoutExt.replace(/[^a-zA-Z0-9_-]/g, "_");
        const timestamp = Date.now();
        const filename = `${cleanName}-${moduleCode}-${timestamp}${ext}`;
        cb(null, filename);
    }
});

const getBaseUrl = (req: Request): string => {
    if (process.env.BACKEND_URL) {
        return process.env.BACKEND_URL.replace(/\/$/, ""); // Remove trailing slash if present
    }
    if (process.env.BASE_URL) {
        return process.env.BASE_URL.replace(/\/$/, ""); // Remove trailing slash if present
    }
    // Fallback to request host info
    const protocol = (req.headers["x-forwarded-proto"] as string) || req.protocol;
    const host = req.get("host");
    return `${protocol}://${host}`;
};

const upload = multer({ storage });

// POST /api/upload - Single file upload
router.post("/", upload.single("image"), (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: "No file uploaded" });
        }
        const moduleCode = (req.query.module as string) || "others";
        const subFolder = getSubFolder(moduleCode);
        const baseUrl = getBaseUrl(req);
        const fileUrl = `${baseUrl}/uploads/${subFolder}/${req.file.filename}`;
        return res.json({ success: true, url: fileUrl });
    } catch (error) {
        next(error);
    }
});

// POST /api/upload/multiple - Multiple files upload
router.post("/multiple", upload.array("images", 10), (req: Request, res: Response, next: NextFunction) => {
    try {
        const files = req.files as Express.Multer.File[];
        if (!files || files.length === 0) {
            return res.status(400).json({ success: false, message: "No files uploaded" });
        }
        const moduleCode = (req.query.module as string) || "others";
        const subFolder = getSubFolder(moduleCode);
        const baseUrl = getBaseUrl(req);
        const urls = files.map((file) => `${baseUrl}/uploads/${subFolder}/${file.filename}`);
        return res.json({ success: true, urls });
    } catch (error) {
        next(error);
    }
});

export default router;
