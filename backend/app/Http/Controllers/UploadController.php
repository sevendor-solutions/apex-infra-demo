<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\File;
use App\Services\AuditLogger;

class UploadController extends Controller
{
    private function getSubFolder(?string $moduleCode): string
    {
        return match ($moduleCode) {
            'MP' => 'properties',
            'MMS' => 'marketing',
            'MVA' => 'marketing_visual_assets',
            'PVA' => 'project_visual_assets',
            'MBN' => 'blogs',
            default => 'others',
        };
    }

    public function uploadSingle(Request $request)
    {
        if (!$request->hasFile('image')) {
            return response()->json(['success' => false, 'message' => 'No file uploaded'], 400);
        }

        $file = $request->file('image');
        $moduleCode = $request->query('module', 'others');
        $subFolder = $this->getSubFolder($moduleCode);

        $uploadDir = public_path("uploads/{$subFolder}");
        if (!File::exists($uploadDir)) {
            File::makeDirectory($uploadDir, 0755, true);
        }

        $originalName = pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME);
        $cleanName = preg_replace('/[^a-zA-Z0-9_-]/', '_', $originalName);
        $ext = $file->getClientOriginalExtension();
        $timestamp = round(microtime(true) * 1000);
        $filename = "{$cleanName}-{$moduleCode}-{$timestamp}.{$ext}";

        $file->move($uploadDir, $filename);

        $baseUrl = url('/');
        $fileUrl = "{$baseUrl}/uploads/{$subFolder}/{$filename}";

        AuditLogger::log($request, 'File Upload', "Uploaded file: {$filename} into {$subFolder}", 'Success');

        return response()->json(['success' => true, 'url' => $fileUrl]);
    }

    public function uploadMultiple(Request $request)
    {
        $files = $request->file('images');
        if (!$files || count($files) === 0) {
            return response()->json(['success' => false, 'message' => 'No files uploaded'], 400);
        }

        $moduleCode = $request->query('module', 'others');
        $subFolder = $this->getSubFolder($moduleCode);

        $uploadDir = public_path("uploads/{$subFolder}");
        if (!File::exists($uploadDir)) {
            File::makeDirectory($uploadDir, 0755, true);
        }

        $urls = [];
        $baseUrl = url('/');

        foreach ($files as $file) {
            $originalName = pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME);
            $cleanName = preg_replace('/[^a-zA-Z0-9_-]/', '_', $originalName);
            $ext = $file->getClientOriginalExtension();
            $timestamp = round(microtime(true) * 1000);
            $filename = "{$cleanName}-{$moduleCode}-{$timestamp}.{$ext}";

            $file->move($uploadDir, $filename);
            $urls[] = "{$baseUrl}/uploads/{$subFolder}/{$filename}";
        }

        AuditLogger::log($request, 'Multiple Files Upload', 'Uploaded ' . count($urls) . " files into {$subFolder}", 'Success');

        return response()->json(['success' => true, 'urls' => $urls]);
    }
}
