import { MailConfig } from "../models/MailConfig";

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

        let response;
        if (imageUrl) {
            // Facebook Graph API to publish photo
            const url = `https://graph.facebook.com/v20.0/${pageId}/photos`;
            response = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    url: imageUrl,
                    caption: message,
                    access_token: facebookPageAccessToken
                })
            });
        } else {
            // Facebook Graph API to publish feed post
            const url = `https://graph.facebook.com/v20.0/${pageId}/feed`;
            response = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    message: message,
                    access_token: facebookPageAccessToken
                })
            });
        }

        const data: any = await response.json();
        if (response.ok && (data.id || data.post_id)) {
            return { success: true, postId: data.id || data.post_id };
        } else {
            const errDetails = data.error ? data.error.message : JSON.stringify(data);
            return { success: false, error: errDetails };
        }
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

        // Helper function to create & publish media container
        const attemptPublish = async (targetUrl: string): Promise<{ success: boolean; postId?: string; error?: string }> => {
            // Step 1: Create media container
            const containerUrl = `https://graph.facebook.com/v20.0/${igUserId}/media`;
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
            if (!containerResponse.ok || !containerData.id) {
                const errDetails = containerData.error ? containerData.error.message : JSON.stringify(containerData);
                return { success: false, error: errDetails };
            }

            const creationId = containerData.id;

            // Step 2: Poll/Wait for container to be ready (up to 10 seconds)
            let isReady = false;
            const statusUrl = `https://graph.facebook.com/v20.0/${creationId}?fields=status_code&access_token=${facebookPageAccessToken}`;
            
            for (let attempt = 0; attempt < 5; attempt++) {
                await new Promise(resolve => setTimeout(resolve, 2000));
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
            } else {
                const errDetails = publishData.error ? publishData.error.message : JSON.stringify(publishData);
                return { success: false, error: errDetails };
            }
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

