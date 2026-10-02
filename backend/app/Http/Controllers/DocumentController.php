<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Document;
use App\Services\AuditLogger;

class DocumentController extends Controller
{
    public function index(Request $request)
    {
        $query = Document::query();
        if ($request->query('category')) {
            $query->where('category', $request->query('category'));
        }
        if ($request->query('projectAssociation')) {
            $query->where('projectAssociation', $request->query('projectAssociation'));
        }
        $docs = $query->orderBy('sortOrder', 'asc')->orderBy('createdAt', 'desc')->get();
        return response()->json(['success' => true, 'data' => $docs]);
    }

    public function reorder(Request $request)
    {
        $items = $request->input('items', []);
        if (is_array($items)) {
            foreach ($items as $item) {
                $payload = ['sortOrder' => $item['sortOrder'] ?? 0];
                if (isset($item['category'])) {
                    $payload['category'] = $item['category'];
                }
                Document::where('id', $item['id'])->update($payload);
            }
        }
        return response()->json(['success' => true, 'message' => 'Reordered successfully']);
    }

    public function show($id)
    {
        $doc = Document::find($id);
        if (!$doc) {
            return response()->json(['success' => false, 'message' => 'Document not found'], 404);
        }
        return response()->json(['success' => true, 'data' => $doc]);
    }

    public function store(Request $request)
    {
        $authUser = $request->attributes->get('auth_user');
        $data = $request->all();
        $data['userId'] = $authUser['id'] ?? null;

        $doc = Document::create($data);
        AuditLogger::log($request, 'Document Uploaded', "Uploaded document: \"{$doc->title}\" (Category: {$doc->category})", 'Success');

        return response()->json(['success' => true, 'data' => $doc], 201);
    }

    public function update(Request $request, $id)
    {
        $doc = Document::find($id);
        if (!$doc) {
            return response()->json(['success' => false, 'message' => 'Document not found'], 404);
        }

        $doc->update($request->all());
        AuditLogger::log($request, 'Document Updated', "Updated document: \"{$doc->title}\" (Category: {$doc->category})", 'Success');

        return response()->json(['success' => true, 'data' => $doc]);
    }

    public function destroy(Request $request, $id)
    {
        $doc = Document::find($id);
        if (!$doc) {
            return response()->json(['success' => false, 'message' => 'Document not found'], 404);
        }

        $title = $doc->title;
        $category = $doc->category;
        $doc->delete();

        AuditLogger::log($request, 'Document Deleted', "Deleted document: \"{$title}\" (Category: {$category})", 'Success');

        return response()->json(['success' => true, 'message' => 'Document deleted successfully']);
    }
}
