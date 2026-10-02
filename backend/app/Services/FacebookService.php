<?php

namespace App\Services;

use App\Models\MailConfig;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class FacebookService
{
    private static function isLocalOrPrivateUrl(?string $urlStr): bool
    {
        if (!$urlStr) return false;
        try {
            $parsed = parse_url($urlStr);
            $host = strtolower($parsed['host'] ?? '');
            if (in_array($host, ['localhost', '127.0.0.1', '::1']) || str_ends_with($host, '.local')) {
                return true;
            }
            if (preg_match('/^(10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/', $host)) {
                return true;
            }
            return false;
        } catch (\Throwable $e) {
            return false;
        }
    }

    public static function publishToFacebook(string $message, ?string $imageUrl = null): array
    {
        try {
            $config = MailConfig::find('default');
            if (!$config || empty($config->facebookPageId) || empty($config->facebookPageAccessToken)) {
                return ['success' => false, 'error' => 'Facebook Page ID or Access Token is not configured'];
            }

            $pageId = preg_replace('/\D/', '', $config->facebookPageId);
            $token = $config->facebookPageAccessToken;
            $isLocal = self::isLocalOrPrivateUrl($imageUrl);

            if ($imageUrl && !$isLocal) {
                // Post photo
                $response = Http::post("https://graph.facebook.com/v19.0/{$pageId}/photos", [
                    'url' => $imageUrl,
                    'message' => $message,
                    'access_token' => $token,
                ]);
            } else {
                // Post text feed
                $response = Http::post("https://graph.facebook.com/v19.0/{$pageId}/feed", [
                    'message' => $message,
                    'access_token' => $token,
                ]);
            }

            if ($response->successful()) {
                $data = $response->json();
                return ['success' => true, 'postId' => $data['id'] ?? ($data['post_id'] ?? null)];
            }

            return ['success' => false, 'error' => $response->body()];
        } catch (\Throwable $e) {
            Log::error('Facebook publish error: ' . $e->getMessage());
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    public static function publishToInstagram(string $caption, string $imageUrl): array
    {
        try {
            $config = MailConfig::find('default');
            if (!$config || empty($config->instagramAccountId) || empty($config->facebookPageAccessToken)) {
                return ['success' => false, 'error' => 'Instagram Account ID or Page Access Token not configured'];
            }

            $igId = preg_replace('/\D/', '', $config->instagramAccountId);
            $token = $config->facebookPageAccessToken;

            if (self::isLocalOrPrivateUrl($imageUrl)) {
                return ['success' => false, 'error' => 'Instagram requires a publicly accessible image URL'];
            }

            // Step 1: Create media container
            $containerRes = Http::post("https://graph.facebook.com/v19.0/{$igId}/media", [
                'image_url' => $imageUrl,
                'caption' => $caption,
                'access_token' => $token,
            ]);

            if (!$containerRes->successful()) {
                return ['success' => false, 'error' => $containerRes->body()];
            }

            $containerId = $containerRes->json()['id'] ?? null;
            if (!$containerId) {
                return ['success' => false, 'error' => 'Failed to obtain Instagram container ID'];
            }

            // Step 2: Publish container
            $publishRes = Http::post("https://graph.facebook.com/v19.0/{$igId}/media_publish", [
                'creation_id' => $containerId,
                'access_token' => $token,
            ]);

            if ($publishRes->successful()) {
                return ['success' => true, 'mediaId' => $publishRes->json()['id'] ?? null];
            }

            return ['success' => false, 'error' => $publishRes->body()];
        } catch (\Throwable $e) {
            Log::error('Instagram publish error: ' . $e->getMessage());
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }
}
