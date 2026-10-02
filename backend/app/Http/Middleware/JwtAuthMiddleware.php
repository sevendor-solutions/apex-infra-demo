<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use App\Models\User;

class JwtAuthMiddleware
{
    public static function createToken(array $payload, int $expiryDays = 30): string
    {
        $secret = env('JWT_SECRET', 'jk_future_infra_secret_jwt_key_2026');
        $header = json_encode(['typ' => 'JWT', 'alg' => 'HS256']);
        $payload['iat'] = time();
        $payload['exp'] = time() + ($expiryDays * 86400);

        $base64UrlHeader = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($header));
        $base64UrlPayload = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode(json_encode($payload)));

        $signature = hash_hmac('sha256', $base64UrlHeader . "." . $base64UrlPayload, $secret, true);
        $base64UrlSignature = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($signature));

        return $base64UrlHeader . "." . $base64UrlPayload . "." . $base64UrlSignature;
    }

    public static function verifyToken(string $token): ?array
    {
        $secret = env('JWT_SECRET', 'jk_future_infra_secret_jwt_key_2026');
        $parts = explode('.', $token);
        if (count($parts) !== 3) {
            return null;
        }

        list($header64, $payload64, $sig64) = $parts;

        $sig = base64_decode(str_replace(['-', '_'], ['+', '/'], $sig64));
        $expectedSig = hash_hmac('sha256', $header64 . "." . $payload64, $secret, true);

        if (!hash_equals($sig, $expectedSig)) {
            return null;
        }

        $payload = json_decode(base64_decode(str_replace(['-', '_'], ['+', '/'], $payload64)), true);
        if (!$payload || (isset($payload['exp']) && time() > $payload['exp'])) {
            return null;
        }

        return $payload;
    }

    public function handle(Request $request, Closure $next)
    {
        $authHeader = $request->header('Authorization');
        if (!$authHeader || !str_starts_with($authHeader, 'Bearer ')) {
            return response()->json([
                'success' => false,
                'message' => 'Access Denied: No authentication token provided.'
            ], 401);
        }

        $token = substr($authHeader, 7);
        $decoded = self::verifyToken($token);

        if (!$decoded || !isset($decoded['id'])) {
            return response()->json([
                'success' => false,
                'message' => 'Access Denied: Invalid or expired authentication token.'
            ], 401);
        }

        $user = User::find($decoded['id']);
        if (!$user || !$user->isActive) {
            return response()->json([
                'success' => false,
                'message' => 'Access Denied: Your account is inactive or session has ended.'
            ], 401);
        }

        $request->attributes->set('auth_user', [
            'id' => $user->id,
            'username' => $user->username,
            'role' => $user->role,
        ]);

        return $next($request);
    }
}
