<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\MarketingAgent;
use App\Services\AuditLogger;

class MarketingAgentController extends Controller
{
    public function index()
    {
        $agents = MarketingAgent::orderBy('name', 'asc')->get();
        return response()->json(['success' => true, 'data' => $agents]);
    }

    public function show($id)
    {
        $agent = MarketingAgent::find($id);
        if (!$agent) {
            return response()->json(['success' => false, 'message' => 'Marketing agent not found'], 404);
        }
        return response()->json(['success' => true, 'data' => $agent]);
    }

    public function store(Request $request)
    {
        $data = $request->except(['id']);
        $name = trim($data['name'] ?? '');
        $phone = trim($data['phone'] ?? '');

        if (!$name) {
            return response()->json(['success' => false, 'message' => 'Agent full name is required'], 400);
        }

        $query = MarketingAgent::whereRaw('LOWER(name) = ?', [strtolower($name)]);
        if ($phone) {
            $query->orWhere('phone', $phone);
        }
        $existing = $query->first();

        if ($existing) {
            $field = ($phone && $existing->phone === $phone) ? 'phone number' : 'name';
            return response()->json(['success' => false, 'message' => "A marketing agent with this {$field} already exists"], 400);
        }

        $authUser = $request->attributes->get('auth_user');
        $data['userId'] = $authUser['id'] ?? null;

        $newAgent = MarketingAgent::create($data);
        AuditLogger::log($request, 'Create Marketing Agent', "Created marketing agent: {$newAgent->name}", 'Success', ['agentId' => $newAgent->id]);
        return response()->json(['success' => true, 'data' => $newAgent], 201);
    }

    public function update(Request $request, $id)
    {
        $agent = MarketingAgent::find($id);
        if (!$agent) {
            return response()->json(['success' => false, 'message' => 'Marketing agent not found'], 404);
        }

        $name = trim($request->input('name', ''));
        $phone = trim($request->input('phone', ''));

        if ($name || $phone) {
            $query = MarketingAgent::where('id', '!=', $agent->id);
            $query->where(function ($q) use ($name, $phone) {
                if ($name) $q->whereRaw('LOWER(name) = ?', [strtolower($name)]);
                if ($phone) $q->orWhere('phone', $phone);
            });

            $existing = $query->first();
            if ($existing) {
                $field = ($phone && $existing->phone === $phone) ? 'phone number' : 'name';
                return response()->json(['success' => false, 'message' => "Another marketing agent with this {$field} already exists"], 400);
            }
        }

        $agent->update($request->all());
        AuditLogger::log($request, 'Update Marketing Agent', "Updated details for agent: {$agent->name}", 'Success', ['agentId' => $agent->id]);
        return response()->json(['success' => true, 'data' => $agent]);
    }

    public function destroy($id)
    {
        $agent = MarketingAgent::find($id);
        if (!$agent) {
            return response()->json(['success' => false, 'message' => 'Marketing agent not found'], 404);
        }
        $name = $agent->name;
        $agent->delete();
        AuditLogger::log(request(), 'Delete Marketing Agent', "Deleted marketing agent: {$name}", 'Success', ['agentId' => $id]);
        return response()->json(['success' => true, 'message' => 'Marketing agent deleted successfully']);
    }
}
