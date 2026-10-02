<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\CostAnalysis;
use App\Services\AuditLogger;

class CostAnalysisController extends Controller
{
    public function index()
    {
        $analyses = CostAnalysis::orderBy('updated_at', 'desc')->orderBy('created_at', 'desc')->get();
        return response()->json(['success' => true, 'data' => $analyses]);
    }

    public function show($id)
    {
        $analysis = CostAnalysis::find($id);
        if (!$analysis) {
            return response()->json(['success' => false, 'message' => 'Cost analysis sheet not found'], 404);
        }
        return response()->json(['success' => true, 'data' => $analysis]);
    }

    public function store(Request $request)
    {
        $data = $request->all();
        if (empty($data['projectName'])) {
            return response()->json(['success' => false, 'message' => 'Project Name is required'], 400);
        }

        $analysis = null;
        if (!empty($data['id'])) {
            $analysis = CostAnalysis::find($data['id']);
        }
        if (!$analysis && !empty($data['projectId'])) {
            $analysis = CostAnalysis::where('projectId', $data['projectId'])->first();
        }

        if ($analysis) {
            $analysis->update($data);
            AuditLogger::log($request, 'Update Cost Analysis', "Updated cost analysis for project: {$analysis->projectName}", 'Success', ['sheetId' => $analysis->id]);
            return response()->json(['success' => true, 'data' => $analysis]);
        } else {
            $created = CostAnalysis::create($data);
            AuditLogger::log($request, 'Create Cost Analysis', "Created cost analysis for project: {$created->projectName}", 'Success', ['sheetId' => $created->id]);
            return response()->json(['success' => true, 'data' => $created], 201);
        }
    }

    public function update(Request $request, $id)
    {
        $analysis = CostAnalysis::find($id);
        if (!$analysis) {
            return response()->json(['success' => false, 'message' => 'Cost analysis sheet not found'], 404);
        }

        $analysis->update($request->all());
        AuditLogger::log($request, 'Update Cost Analysis', "Updated cost analysis for project: {$analysis->projectName}", 'Success', ['sheetId' => $analysis->id]);

        return response()->json(['success' => true, 'data' => $analysis]);
    }

    public function destroy(Request $request, $id)
    {
        $analysis = CostAnalysis::find($id);
        if (!$analysis) {
            return response()->json(['success' => false, 'message' => 'Cost analysis sheet not found'], 404);
        }

        $name = $analysis->projectName;
        $analysis->delete();
        AuditLogger::log($request, 'Delete Cost Analysis', "Deleted cost analysis sheet for project: {$name}", 'Success', ['sheetId' => $id]);

        return response()->json(['success' => true, 'message' => 'Cost analysis sheet deleted successfully']);
    }
}
