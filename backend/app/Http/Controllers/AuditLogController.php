<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\AuditLog;
use App\Services\AuditLogger;

class AuditLogController extends Controller
{
    public function index()
    {
        $logs = AuditLog::orderBy('created_at', 'desc')->limit(1000)->get();
        $formatted = $logs->map(function ($l) {
            return [
                'id' => $l->id,
                'timestamp' => $l->created_at->toISOString(),
                'user' => $l->user,
                'role' => $l->role,
                'action' => $l->action,
                'details' => $l->details,
                'ip' => $l->ip ?: '127.0.0.1',
                'status' => $l->status,
            ];
        });

        return response()->json(['success' => true, 'data' => $formatted]);
    }

    public function store(Request $request)
    {
        $action = $request->input('action', 'Manual Action');
        $details = $request->input('details', '');
        $status = $request->input('status', 'Success');

        AuditLogger::log($request, $action, $details, $status);
        return response()->json(['success' => true, 'message' => 'Audit log created successfully'], 201);
    }

    public function clear(Request $request)
    {
        AuditLog::truncate();
        AuditLogger::log($request, 'Clear Audit Logs', 'Cleared system audit trail database table', 'Success');
        return response()->json(['success' => true, 'message' => 'Audit logs cleared successfully']);
    }
}
