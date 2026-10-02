<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\ProjectInspection;
use App\Services\AuditLogger;

class ProjectInspectionController extends Controller
{
    public function index()
    {
        $inspections = ProjectInspection::orderBy('updated_at', 'desc')->orderBy('created_at', 'desc')->get();
        return response()->json(['success' => true, 'data' => $inspections]);
    }

    public function showByProject($projectId)
    {
        $inspection = ProjectInspection::where('projectId', $projectId)->first();
        return response()->json(['success' => true, 'data' => $inspection]);
    }

    public function store(Request $request)
    {
        $data = $request->all();
        $projectId = $data['projectId'] ?? null;
        $projectName = $data['projectName'] ?? null;

        if (!$projectId || !$projectName) {
            return response()->json(['success' => false, 'message' => 'Project ID and Project Name are required'], 400);
        }

        $record = null;
        if (!empty($data['id'])) {
            $record = ProjectInspection::find($data['id']);
        }
        if (!$record) {
            $record = ProjectInspection::where('projectId', $projectId)->first();
        }

        if ($record) {
            $record->update($data);
            AuditLogger::log($request, 'Update Project Inspection', "Updated stage inspection for: {$record->projectName}", 'Success', ['inspectionId' => $record->id]);
            return response()->json(['success' => true, 'data' => $record]);
        } else {
            $data['id'] = $data['id'] ?? ("insp_" . $projectId);
            $created = ProjectInspection::create($data);
            AuditLogger::log($request, 'Create Project Inspection', "Created stage inspection for: {$created->projectName}", 'Success', ['inspectionId' => $created->id]);
            return response()->json(['success' => true, 'data' => $created], 201);
        }
    }

    public function destroy(Request $request, $id)
    {
        $record = ProjectInspection::find($id);
        if (!$record) {
            return response()->json(['success' => false, 'message' => 'Inspection record not found'], 404);
        }

        $name = $record->projectName;
        $record->delete();
        AuditLogger::log($request, 'Delete Project Inspection', "Deleted stage inspection for: {$name}", 'Success', ['inspectionId' => $id]);

        return response()->json(['success' => true, 'message' => 'Inspection record deleted successfully']);
    }
}
