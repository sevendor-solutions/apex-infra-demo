<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Adds Cache-Control headers to read-only GET endpoints.
 * This lets the browser serve repeated requests (like tab switches) instantly
 * without hitting the PHP server again for at least 30 seconds.
 *
 * Protected (JWT-gated) endpoints: 30s max-age, private cache (user-specific).
 * Public  endpoints: 60s max-age, shared cache (CDN / proxy friendly).
 */
class CacheHeadersMiddleware
{
    // These route prefixes are public-facing (no auth required).
    private const PUBLIC_PREFIXES = [
        'api/projects',
        'api/marketing',
        'api/blogs',
        'api/gallery',
        'api/masters',
        'api/enquiries', // public enquiry submission
    ];

    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        // Only cache successful GET responses
        if (!$request->isMethod('GET') || $response->getStatusCode() !== 200) {
            return $response;
        }

        $path = ltrim($request->path(), '/');

        // Skip streaming / file responses
        if (!$response instanceof \Illuminate\Http\JsonResponse) {
            return $response;
        }

        $isPublic = false;
        foreach (self::PUBLIC_PREFIXES as $prefix) {
            if (str_starts_with($path, $prefix)) {
                $isPublic = true;
                break;
            }
        }

        if ($isPublic) {
            // Public data: browsers & proxies may cache for 60 seconds
            $response->headers->set('Cache-Control', 'public, max-age=60, stale-while-revalidate=30');
        } else {
            // Authenticated data: only the browser may cache, for 30 seconds
            $response->headers->set('Cache-Control', 'private, max-age=30, must-revalidate');
        }

        return $response;
    }
}
