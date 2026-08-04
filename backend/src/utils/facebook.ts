import { MailConfig } from "../models/MailConfig";

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function isLocalOrPrivateUrl(urlStr?: string): boolean {
    if (!urlStr) return false;
    try {
        const parsed = new URL(urlStr);
        const host = parsed.hostname.toLowerCase();
        if (host === 'localhost' || host === '127.0.0.1' || host === '::1' || host.endsWith('.local')) {
            return true;
        }
        if (/^(10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/.test(host)) {
            return true;
        }
        return false;
    } catch {
        return false;
    }
}

function isTransientMetaError(data: any, statusCode?: number): boolean {
    if (statusCode && statusCode >= 500) return true;
    const msg = (data?.error?.message || JSON.stringify(data || "")).toLowerCase();
    const code = data?.error?.code;
    return (
        msg.includes("please reduce the amount of data") ||
        msg.includes("an unknown error occurred") ||
        msg.includes("transient") ||
        msg.includes("try again later") ||
        code === 1 ||
        code === 2 ||
        code === 100
    );
}

export async function publishToFacebook(message: string, imageUrl?: string): Promise<{ success: boolean; postId?: string; error?: string }> {
    try {
        const config = await MailConfig.findByPk("default");
        if (!config) {
            return { success: false, error: "Configuration not found" };
        }

        const facebookPageId = config.facebookPageId;
        const facebookPageAccessToken = config.facebookPageAccessToken;

        if (!facebookPageId || !facebookPageAccessToken) {
            return { success: false, error: "Facebook Page ID or Access Token is not configured in System Settings" };
        }

        // Clean Page ID to ensure it is just numeric
        const pageId = facebookPageId.replace(/\D/g, "");
        if (!pageId) {
            return { success: false, error: "Invalid Facebook Page ID" };
        }

        const isLocalImg = isLocalOrPrivateUrl(imageUrl);
        const canUsePhotoEndpoint = Boolean(imageUrl && !isLocalImg);

        // Option 1: Try publishing with photo attachment if image URL is available and public
        if (canUsePhotoEndpoint && imageUrl) {
            const photoUrl = `https://graph.facebook.com/v20.0/${pageId}/photos`;
            let photoAttemptError = "";

            for (let attempt = 1; attempt <= 3; attempt++) {
                try {
                    const response = await fetch(photoUrl, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            url: imageUrl,
                            caption: message,
                            access_token: facebookPageAccessToken
                        })
                    });

                    const data: any = await response.json();
                    if (response.ok && (data.id || data.post_id)) {
                        return { success: true, postId: data.id || data.post_id };
                    }

                    photoAttemptError = data.error ? data.error.message : JSON.stringify(data);
                    console.warn(`Facebook Photo publish attempt ${attempt} failed: ${photoAttemptError}`);

                    if (isTransientMetaError(data, response.status) && attempt < 3) {
                        await sleep(2000 * attempt);
                        continue;
                    }
                    break;
                } catch (fetchErr: any) {
                    photoAttemptError = fetchErr.message || "Network request failed";
                    console.warn(`Facebook Photo publish attempt ${attempt} network error: ${photoAttemptError}`);
                    if (attempt < 3) {
                        await sleep(2000 * attempt);
                        continue;
                    }
                }
            }

            console.warn(`Facebook Photo publishing failed (${photoAttemptError}). Retrying as feed text post...`);
        }

        // Option 2: Fallback or Direct Feed Post (published text post directly to feed)
        const feedUrl = `https://graph.facebook.com/v20.0/${pageId}/feed`;
        let feedAttemptError = "";

        for (let attempt = 1; attempt <= 3; attempt++) {
            try {
                const response = await fetch(feedUrl, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        message: message,
                        access_token: facebookPageAccessToken
                    })
                });

                const data: any = await response.json();
                if (response.ok && (data.id || data.post_id)) {
                    return { success: true, postId: data.id || data.post_id };
                }

                feedAttemptError = data.error ? data.error.message : JSON.stringify(data);
                console.warn(`Facebook Feed publish attempt ${attempt} failed: ${feedAttemptError}`);

                if (isTransientMetaError(data, response.status) && attempt < 3) {
                    await sleep(2000 * attempt);
                    continue;
                }
                break;
            } catch (fetchErr: any) {
                feedAttemptError = fetchErr.message || "Network request failed";
                if (attempt < 3) {
                    await sleep(2000 * attempt);
                    continue;
                }
            }
        }

        return { success: false, error: feedAttemptError || "Unknown Facebook API error" };
    } catch (err: any) {
        console.error("Facebook API publishing failed:", err);
        return { success: false, error: err.message || "Unknown transport error" };
    }
}

export async function publishToInstagram(
    message: string, 
    imageUrl: string, 
    fallbackImageUrl?: string
): Promise<{ success: boolean; postId?: string; error?: string; usedFallback?: boolean }> {
    try {
        const config = await MailConfig.findByPk("default");
        if (!config) {
            return { success: false, error: "Configuration not found" };
        }

        const instagramAccountId = config.instagramAccountId;
        const facebookPageAccessToken = config.facebookPageAccessToken;

        if (!instagramAccountId || !facebookPageAccessToken) {
            return { success: false, error: "Instagram Account ID or Access Token is not configured in System Settings" };
        }

        // Clean Instagram Account ID to ensure it is just numeric
        const igUserId = instagramAccountId.replace(/\D/g, "");
        if (!igUserId) {
            return { success: false, error: "Invalid Instagram Account ID" };
        }

        // Helper function to create & publish media container with exponential retries for transient Meta errors
        const attemptPublish = async (targetUrl: string): Promise<{ success: boolean; postId?: string; error?: string }> => {
            if (isLocalOrPrivateUrl(targetUrl)) {
                return { success: false, error: "Instagram requires a publicly accessible image URL (cannot be localhost or private IP)." };
            }

            // Step 1: Create media container
            const containerUrl = `https://graph.facebook.com/v20.0/${igUserId}/media`;
            let creationId = "";
            let lastError = "";

            for (let attempt = 1; attempt <= 3; attempt++) {
                try {
                    const containerResponse = await fetch(containerUrl, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            image_url: targetUrl,
                            caption: message,
                            access_token: facebookPageAccessToken
                        })
                    });

                    const containerData: any = await containerResponse.json();
                    if (containerResponse.ok && containerData.id) {
                        creationId = containerData.id;
                        break;
                    }

                    lastError = containerData.error ? containerData.error.message : JSON.stringify(containerData);
                    if (isTransientMetaError(containerData, containerResponse.status) && attempt < 3) {
                        await sleep(2000 * attempt);
                        continue;
                    }
                    break;
                } catch (fetchErr: any) {
                    lastError = fetchErr.message || "Network request failed";
                    if (attempt < 3) {
                        await sleep(2000 * attempt);
                        continue;
                    }
                }
            }

            if (!creationId) {
                return { success: false, error: lastError || "Failed to create media container" };
            }

            // Step 2: Poll/Wait for container to be ready (up to 10 seconds)
            let isReady = false;
            const statusUrl = `https://graph.facebook.com/v20.0/${creationId}?fields=status_code&access_token=${facebookPageAccessToken}`;
            
            for (let attempt = 0; attempt < 5; attempt++) {
                await sleep(2000);
                const statusResponse = await fetch(statusUrl);
                if (statusResponse.ok) {
                    const statusData: any = await statusResponse.json();
                    if (statusData.status_code === "FINISHED") {
                        isReady = true;
                        break;
                    } else if (statusData.status_code === "ERROR") {
                        const errDetails = statusData.error ? statusData.error.message : "Container processing error";
                        return { success: false, error: errDetails };
                    }
                }
            }

            if (!isReady) {
                console.log("Instagram media container polling timed out, attempting publish anyway...");
            }

            // Step 3: Publish container
            const publishUrl = `https://graph.facebook.com/v20.0/${igUserId}/media_publish`;
            for (let attempt = 1; attempt <= 3; attempt++) {
                try {
                    const publishResponse = await fetch(publishUrl, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            creation_id: creationId,
                            access_token: facebookPageAccessToken
                        })
                    });

                    const publishData: any = await publishResponse.json();
                    if (publishResponse.ok && publishData.id) {
                        return { success: true, postId: publishData.id };
                    }

                    lastError = publishData.error ? publishData.error.message : JSON.stringify(publishData);
                    if (isTransientMetaError(publishData, publishResponse.status) && attempt < 3) {
                        await sleep(2000 * attempt);
                        continue;
                    }
                    break;
                } catch (fetchErr: any) {
                    lastError = fetchErr.message || "Network request failed";
                    if (attempt < 3) {
                        await sleep(2000 * attempt);
                        continue;
                    }
                }
            }

            return { success: false, error: lastError || "Failed to publish Instagram media" };
        };

        // Try publishing with primary image URL
        const primaryResult = await attemptPublish(imageUrl);
        if (primaryResult.success) {
            return primaryResult;
        }

        // If primary image failed (e.g. aspect ratio unsupported) and a fallback logo URL exists, retry with fallback
        if (fallbackImageUrl && fallbackImageUrl !== imageUrl) {
            console.warn(`Instagram publish failed with primary image (${primaryResult.error}). Retrying with fallback logo: ${fallbackImageUrl}`);
            const fallbackResult = await attemptPublish(fallbackImageUrl);
            if (fallbackResult.success) {
                return { success: true, postId: fallbackResult.postId, usedFallback: true };
            }
        }

        return { success: false, error: `Failed to create Instagram media container: ${primaryResult.error}` };
    } catch (err: any) {
        console.error("Instagram API publishing failed:", err);
        return { success: false, error: err.message || "Unknown transport error" };
    }
}


