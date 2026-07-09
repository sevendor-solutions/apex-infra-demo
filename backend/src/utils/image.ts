
import { Request } from "express";

export const getFullImageUrl = (req: Request, filename: string | null | undefined): string | null => {
    if (!filename) return null;
    if (filename.startsWith('http')) return filename;

    const host = req.get('host');
    if (!host) return filename;

    return `${req.protocol}://${host}/uploads/${filename}`;
};
