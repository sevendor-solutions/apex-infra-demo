<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\JobApplication;
use App\Services\AuditLogger;

class CareerController extends Controller
{
    public function getApplications()
    {
        $applications = JobApplication::orderBy('date', 'desc')->get();
        return response()->json(['success' => true, 'data' => $applications]);
    }

    public function apply(Request $request)
    {
        $application = JobApplication::create($request->all());
        AuditLogger::log($request, 'New Job Application', "New job application from: {$application->fullName} for {$application->role}", 'Success', ['applicationId' => $application->id]);
        return response()->json(['success' => true, 'data' => $application], 201);
    }

    public function updateApplication(Request $request, $id)
    {
        $application = JobApplication::find($id);
        if (!$application) {
            return response()->json(['success' => false, 'message' => 'Application not found'], 404);
        }
        $application->update($request->all());
        AuditLogger::log($request, 'Update Job Application', "Updated application for: {$application->fullName}", 'Success', ['applicationId' => $application->id]);
        return response()->json(['success' => true, 'data' => $application]);
    }

    public function destroyApplication($id)
    {
        $application = JobApplication::find($id);
        if (!$application) {
            return response()->json(['success' => false, 'message' => 'Application not found'], 404);
        }
        $name = $application->fullName;
        $application->delete();
        AuditLogger::log(request(), 'Delete Job Application', "Deleted job application for: {$name}", 'Success', ['applicationId' => $id]);
        return response()->json(['success' => true, 'message' => 'Application deleted successfully']);
    }
}
