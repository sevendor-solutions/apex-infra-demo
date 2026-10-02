<?php

namespace App\Services;

use App\Models\AccountingActivity;
use Illuminate\Http\Request;

class AccountingLogger
{
    public static function log(
        $request,
        string $module,
        string $activityType,
        string $recordId,
        ?float $amount,
        string $description
    ): void {
        try {
            $user = null;
            if ($request instanceof Request && $request->attributes->has('auth_user')) {
                $user = (object)$request->attributes->get('auth_user');
            }

            AccountingActivity::create([
                'dateTime' => now(),
                'module' => $module,
                'activityType' => strtoupper($activityType),
                'recordId' => $recordId,
                'amount' => $amount,
                'description' => $description,
                'userId' => $user->id ?? null,
                'userName' => $user->username ?? ($user->name ?? 'System'),
            ]);

            AuditLogger::log($request, strtoupper($activityType) . ' ' . $module, $description, 'Success');
        } catch (\Throwable $e) {
            \Log::error('AccountingLogger error: ' . $e->getMessage());
        }
    }
}
