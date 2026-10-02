<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Blog;
use App\Services\AuditLogger;

class BlogController extends Controller
{
    public function index(Request $request)
    {
        $query = Blog::query();
        if ($request->query('category')) {
            $query->where('category', $request->query('category'));
        }
        $blogs = $query->orderBy('createdAt', 'desc')->get();
        return response()->json(['success' => true, 'data' => $blogs]);
    }

    public function showBySlug($slug)
    {
        $blog = Blog::where('slug', $slug)->first();
        if (!$blog) {
            return response()->json(['success' => false, 'message' => 'Blog not found'], 404);
        }
        return response()->json(['success' => true, 'data' => $blog]);
    }

    public function show($id)
    {
        $blog = Blog::find($id);
        if (!$blog) {
            return response()->json(['success' => false, 'message' => 'Blog not found'], 404);
        }
        return response()->json(['success' => true, 'data' => $blog]);
    }

    public function store(Request $request)
    {
        $authUser = $request->attributes->get('auth_user');
        $data = $request->all();
        $data['userId'] = $authUser['id'] ?? null;

        $blog = Blog::create($data);
        AuditLogger::log($request, 'Create Blog', "Created blog post: {$blog->title}", 'Success', ['blogId' => $blog->id]);
        return response()->json(['success' => true, 'data' => $blog], 201);
    }

    public function update(Request $request, $id)
    {
        $blog = Blog::find($id);
        if (!$blog) {
            return response()->json(['success' => false, 'message' => 'Blog not found'], 404);
        }
        $blog->update($request->all());
        AuditLogger::log($request, 'Update Blog', "Updated blog post: {$blog->title}", 'Success', ['blogId' => $blog->id]);
        return response()->json(['success' => true, 'data' => $blog]);
    }

    public function destroy($id)
    {
        $blog = Blog::find($id);
        if (!$blog) {
            return response()->json(['success' => false, 'message' => 'Blog not found'], 404);
        }
        $title = $blog->title;
        $blog->delete();
        AuditLogger::log(request(), 'Delete Blog', "Deleted blog post: {$title}", 'Success', ['blogId' => $id]);
        return response()->json(['success' => true, 'message' => 'Blog deleted successfully']);
    }
}
