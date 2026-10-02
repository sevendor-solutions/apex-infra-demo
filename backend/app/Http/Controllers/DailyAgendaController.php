<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\DailyAgendaMatrix;
use App\Services\AuditLogger;

class DailyAgendaController extends Controller
{
    public function index()
    {
        $matrices = DailyAgendaMatrix::orderBy('updated_at', 'desc')->orderBy('created_at', 'desc')->get();
        return response()->json(['success' => true, 'data' => $matrices]);
    }

    public function store(Request $request)
    {
        $data = $request->all();
        $targetId = $data['id'] ?? 'matrix_default';

        $matrix = DailyAgendaMatrix::find($targetId);
        if ($matrix) {
            $matrix->update($data);
            AuditLogger::log($request, 'Update Daily Agenda Matrix', "Updated follow-up matrix: {$matrix->title}", 'Success', ['matrixId' => $matrix->id]);
            return response()->json(['success' => true, 'data' => $matrix]);
        } else {
            $data['id'] = $targetId;
            $data['title'] = $data['title'] ?? 'Daily Construction Follow-up Matrix';
            $created = DailyAgendaMatrix::create($data);
            AuditLogger::log($request, 'Create Daily Agenda Matrix', "Created follow-up matrix: {$created->title}", 'Success', ['matrixId' => $created->id]);
            return response()->json(['success' => true, 'data' => $created], 201);
        }
    }

    public function destroy(Request $request, $id)
    {
        $matrix = DailyAgendaMatrix::find($id);
        if (!$matrix) {
            return response()->json(['success' => false, 'message' => 'Matrix not found'], 404);
        }

        $title = $matrix->title;
        $matrix->delete();
        AuditLogger::log($request, 'Delete Daily Agenda Matrix', "Deleted follow-up matrix: {$title}", 'Success', ['matrixId' => $id]);

        return response()->json(['success' => true, 'message' => 'Matrix deleted successfully']);
    }
}
