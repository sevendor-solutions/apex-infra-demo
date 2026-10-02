<?php

namespace App\Services;

use App\Models\AuditLog;
use Illuminate\Http\Request;

class AuditLogger
{
    public static function log($request, string $action, string $details, string $status = 'Success', array $userOverride = null): void
    {
        try {
            $user = null;
            if ($userOverride) {
                $user = (object)$userOverride;
            } elseif ($request instanceof Request && $request->attributes->has('auth_user')) {
                $user = (object)$request->attributes->get('auth_user');
            }

            $ip = null;
            if ($request instanceof Request) {
                $ip = $request->ip() ?: $request->header('X-Forwarded-For') ?: '127.0.0.1';
            }

            AuditLog::create([
                'user' => $user->username ?? 'Anonymous',
                'role' => $user->role ?? 'Guest',
                'action' => $action,
                'details' => $details,
                'ip' => $ip ?? '127.0.0.1',
                'status' => $status,
            ]);
        } catch (\Throwable $e) {
            \Log::error('AuditLogger error: ' . $e->getMessage());
        }
    }
}
