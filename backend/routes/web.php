<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Response;

Route::get('/', function () {
    return response()->json([
        'status' => 'ok',
        'message' => 'JK Future Infra API Server is running',
        'timestamp' => now()->toIso8601String()
    ]);
});

// Serve uploads directly with CORS and CORP headers
Route::get('/uploads/{path}', function ($path) {
    $fullPath = public_path("uploads/{$path}");
    if (!File::exists($fullPath)) {
        abort(404);
    }
    $file = File::get($fullPath);
    $type = File::mimeType($fullPath);
    $response = Response::make($file, 200);
    $response->header('Content-Type', $type);
    $response->header('Access-Control-Allow-Origin', '*');
    $response->header('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    $response->header('Cross-Origin-Resource-Policy', 'cross-origin');
    return $response;
})->where('path', '.*');
