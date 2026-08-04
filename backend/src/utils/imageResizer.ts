import sharp from "sharp";
import path from "path";
import fs from "fs";

/**
 * Ensures an image URL or filepath complies with Instagram's aspect ratio requirements (0.8 to 1.91).
 * If the image is outside this range (e.g. wide panorama or tall scan), it automatically pads the image 
 * onto a clean white canvas (1:1 ratio) and returns the public URL of the Instagram-compatible image.
 */
export async function ensureInstagramCompatibleImage(
    imgInput: string, 
    baseUrl: string
): Promise<string> {
    try {
        if (!imgInput) return baseUrl + "/uploads/logo.png";

        let imageBuffer: Buffer | null = null;
        let fileExt = ".jpg";
        let baseName = "adjusted_img";

        // Determine if local path or remote URL
        if (imgInput.startsWith("http://") || imgInput.startsWith("https://")) {
            // Check if it's pointing to our own backend server
            const urlObj = new URL(imgInput);
            const pathname = urlObj.pathname; // e.g. /uploads/marketing/abc.jpeg
            const localDiskPath = path.join(__dirname, "../..", pathname);

            if (fs.existsSync(localDiskPath)) {
                imageBuffer = fs.readFileSync(localDiskPath);
                fileExt = path.extname(localDiskPath) || ".jpg";
                baseName = path.basename(localDiskPath, fileExt);
            } else {
                // Remote URL: fetch image buffer
                const resp = await fetch(imgInput);
                if (resp.ok) {
                    const arr = await resp.arrayBuffer();
                    imageBuffer = Buffer.from(arr);
                    baseName = path.basename(pathname, path.extname(pathname)) || "remote_img";
                }
            }
        } else {
            // Relative path e.g. /uploads/marketing/abc.jpg
            const cleanRelPath = imgInput.startsWith("/") ? imgInput : `/${imgInput}`;
            const localDiskPath = path.join(__dirname, "../..", cleanRelPath);

            if (fs.existsSync(localDiskPath)) {
                imageBuffer = fs.readFileSync(localDiskPath);
                fileExt = path.extname(localDiskPath) || ".jpg";
                baseName = path.basename(localDiskPath, fileExt);
            }
        }

        if (!imageBuffer) {
            console.warn(`Could not load image buffer for Instagram check: ${imgInput}`);
            return imgInput.startsWith("http") ? imgInput : `${baseUrl}${imgInput.startsWith('/') ? '' : '/'}${imgInput}`;
        }

        const metadata = await sharp(imageBuffer).metadata();
        const width = metadata.width || 0;
        const height = metadata.height || 0;

        if (width === 0 || height === 0) {
            return imgInput.startsWith("http") ? imgInput : `${baseUrl}${imgInput.startsWith('/') ? '' : '/'}${imgInput}`;
        }

        const ratio = width / height;

        // Instagram allowed aspect ratio range: 4:5 (0.8) to 1.91:1 (1.91)
        if (ratio >= 0.8 && ratio <= 1.91) {
            // Image is already 100% compliant with Instagram!
            return imgInput.startsWith("http") ? imgInput : `${baseUrl}${imgInput.startsWith('/') ? '' : '/'}${imgInput}`;
        }

        console.log(`Auto-adjusting Instagram image (${width}x${height}, ratio ${ratio.toFixed(2)} outside 0.8-1.91)...`);

        // Ensure temp output directory exists: uploads/temp_ig
        const outputDir = path.join(__dirname, "../../uploads/temp_ig");
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        const outputFileName = `${baseName}-ig-${Date.now()}.jpg`;
        const outputDiskPath = path.join(outputDir, outputFileName);

        // Calculate square target canvas (1:1 aspect ratio guarantees Instagram approval)
        const squareDim = Math.max(width, height);

        await sharp(imageBuffer)
            .resize(squareDim, squareDim, {
                fit: "contain",
                background: { r: 255, g: 255, b: 255, alpha: 1 }
            })
            .jpeg({ quality: 92 })
            .toFile(outputDiskPath);

        const adjustedPublicUrl = `${baseUrl}/uploads/temp_ig/${outputFileName}`;
        console.log(`Instagram auto-adjusted image created successfully: ${adjustedPublicUrl}`);
        return adjustedPublicUrl;
    } catch (err) {
        console.error("Error auto-adjusting image for Instagram:", err);
        return imgInput.startsWith("http") ? imgInput : `${baseUrl}${imgInput.startsWith('/') ? '' : '/'}${imgInput}`;
    }
}
