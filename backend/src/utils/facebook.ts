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
