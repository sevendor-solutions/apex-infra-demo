<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\GalleryItem;
use App\Services\AuditLogger;

class GalleryController extends Controller
{
    public function index(Request $request)
    {
        $query = GalleryItem::query();
        if ($request->query('category')) {
            $query->where('category', $request->query('category'));
        }
        $items = $query->orderBy('createdAt', 'desc')->get();
        return response()->json(['success' => true, 'data' => $items]);
    }

    public function store(Request $request)
    {
        $authUser = $request->attributes->get('auth_user');
        $data = $request->all();
        $data['userId'] = $authUser['id'] ?? null;

        $item = GalleryItem::create($data);
        AuditLogger::log($request, 'Create Gallery Item', "Added gallery item: {$item->title} ({$item->category})", 'Success', ['galleryId' => $item->id]);
        return response()->json(['success' => true, 'data' => $item], 201);
    }

    public function update(Request $request, $id)
    {
        $item = GalleryItem::find($id);
        if (!$item) {
            return response()->json(['success' => false, 'message' => 'Gallery item not found'], 404);
        }
        $item->update($request->all());
        AuditLogger::log($request, 'Update Gallery Item', "Updated gallery item: {$item->title}", 'Success', ['galleryId' => $item->id]);
        return response()->json(['success' => true, 'data' => $item]);
    }

    public function destroy($id)
    {
        $item = GalleryItem::find($id);
        if (!$item) {
            return response()->json(['success' => false, 'message' => 'Gallery item not found'], 404);
        }
        $title = $item->title;
        $item->delete();
        AuditLogger::log(request(), 'Delete Gallery Item', "Deleted gallery item: {$title}", 'Success', ['galleryId' => $id]);
        return response()->json(['success' => true, 'message' => 'Gallery item deleted successfully']);
    }
}
