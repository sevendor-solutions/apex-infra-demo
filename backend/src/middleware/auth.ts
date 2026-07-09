import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

// Extend Express Request interface to include decoded user
export interface AuthRequest extends Request {
    user?: {
        id: string;
        username: string;
        role: string;
    };
}

export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
        return res.status(401).json({ success: false, message: "Access Denied: No authentication token provided." });
    }

    try {
        const secret = process.env.JWT_SECRET || "jk_future_infra_secret_jwt_key_2026";
        const decoded = jwt.verify(token, secret) as { id: string; username: string; role: string };
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(403).json({ success: false, message: "Access Denied: Invalid or expired authentication token." });
    }
};
