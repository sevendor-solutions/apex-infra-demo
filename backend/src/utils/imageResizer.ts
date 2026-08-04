import sharp from "sharp";
import path from "path";
import fs from "fs";

/**
 * Automatically inspects an image file and pads it with a white background
 * if its aspect ratio is outside Instagram's allowed range (0.8 to 1.91).
 * Returns the local filepath of the Instagram-compatible image.
 */
export async function ensureInstagramCompatibleImage(inputLocalPath: string): Promise<string | null> {
    try {
        if (!fs.existsSync(inputLocalPath)) {
            return null;
        }

        const metadata = await sharp(inputLocalPath).metadata();
        const width = metadata.width || 0;
        const height = metadata.height || 0;

        if (width === 0 || height === 0) {
            return null;
        }

        const ratio = width / height;

        // Instagram allowed aspect ratio range: 4:5 (0.8) to 1.91:1 (1.91)
        if (ratio >= 0.8 && ratio <= 1.91) {
            // Already compliant with Instagram Graph API!
            return inputLocalPath;
        }

        console.log(`Auto-adjusting image for Instagram (${width}x${height}, ratio ${ratio.toFixed(2)} outside 0.8-1.91)...`);

        // Generate auto-padded Instagram image path
        const ext = path.extname(inputLocalPath);
        const dir = path.dirname(inputLocalPath);
        const base = path.basename(inputLocalPath, ext);
        const outputLocalPath = path.join(dir, `${base}-ig.jpg`);

        // Calculate square/padded dimensions
        let targetWidth = width;
        let targetHeight = height;

        if (ratio > 1.91) {
            // Too wide: pad top/bottom to make square
            targetHeight = Math.round(width);
        } else if (ratio < 0.8) {
            // Too tall: pad left/right to make 4:5 vertical
            targetWidth = Math.round(height * 0.8);
        }

        await sharp(inputLocalPath)
            .resize(targetWidth, targetHeight, {
                fit: "contain",
                background: { r: 255, g: 255, b: 255, alpha: 1 }
            })
            .jpeg({ quality: 92 })
            .toFile(outputLocalPath);

        console.log(`Successfully generated Instagram auto-adjusted image: ${outputLocalPath}`);
        return outputLocalPath;
    } catch (err) {
        console.error("Error auto-adjusting image for Instagram:", err);
        return null;
    }
}
