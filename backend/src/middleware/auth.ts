import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { User } from "../models/User";

// Globally augment Express Request so req.user is available everywhere
declare global {
    namespace Express {
        interface Request {
            user?: {
                id: string;
                username: string;
                role: string;
            };
        }
    }
}

// Extend Express Request interface to include decoded user
export interface AuthRequest extends Request {
    user?: {
        id: string;
        username: string;
        role: string;
    };
}

export const authenticateToken = async (req: AuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
        return res.status(401).json({ success: false, message: "Access Denied: No authentication token provided." });
    }

    try {
        const secret = process.env.JWT_SECRET || "jk_future_infra_secret_jwt_key_2026";
        const decoded = jwt.verify(token, secret) as { id: string; username: string; role: string };
        
        // Check active status in database
        const dbUser = await User.findByPk(decoded.id);
        if (!dbUser || !dbUser.isActive) {
            return res.status(403).json({ success: false, message: "Access Denied: Your account is currently inactive." });
        }

        req.user = decoded;
        next();
    } catch (error) {
        return res.status(403).json({ success: false, message: "Access Denied: Invalid or expired authentication token." });
    }
};
