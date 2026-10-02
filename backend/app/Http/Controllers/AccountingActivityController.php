<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\AccountingActivity;

class AccountingActivityController extends Controller
{
    public function index(Request $request)
    {
        $query = AccountingActivity::query();

        $startDate = $request->query('startDate');
        $endDate = $request->query('endDate');

        if ($startDate && $endDate) {
            $query->whereBetween('dateTime', ["{$startDate} 00:00:00", "{$endDate} 23:59:59"]);
        } elseif ($startDate) {
            $query->where('dateTime', '>=', "{$startDate} 00:00:00");
        } elseif ($endDate) {
            $query->where('dateTime', '<=', "{$endDate} 23:59:59");
        }

        $module = $request->query('module');
        if ($module && $module !== 'all') {
            $query->where('module', $module);
        }

        $activityType = $request->query('activityType');
        if ($activityType && $activityType !== 'all') {
            $query->where('activityType', strtoupper($activityType));
        }

        $search = trim($request->query('search', ''));
        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('recordId', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%")
                  ->orWhere('userName', 'like', "%{$search}%")
                  ->orWhere('module', 'like', "%{$search}%");
            });
        }

        $limit = min((int)$request->query('limit', 1000), 2000);
        $activities = $query->orderBy('dateTime', 'desc')->orderBy('created_at', 'desc')->limit($limit)->get();

        return response()->json(['success' => true, 'data' => $activities]);
    }
}
