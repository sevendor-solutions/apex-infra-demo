<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Enquiry;
use App\Services\AuditLogger;

class EnquiryController extends Controller
{
    public function index(Request $request)
    {
        $enquiries = Enquiry::orderBy('date', 'desc')->get();
        return response()->json(['success' => true, 'data' => $enquiries]);
    }

    public function store(Request $request)
    {
        $enquiry = Enquiry::create($request->all());
        AuditLogger::log($request, 'New Customer Enquiry', "Received new enquiry from: {$enquiry->name} ({$enquiry->phone})", 'Success', ['enquiryId' => $enquiry->id]);
        return response()->json(['success' => true, 'data' => $enquiry], 201);
    }

    public function update(Request $request, $id)
    {
        $enquiry = Enquiry::find($id);
        if (!$enquiry) {
            return response()->json(['success' => false, 'message' => 'Enquiry not found'], 404);
        }
        $enquiry->update($request->all());
        AuditLogger::log($request, 'Update Customer Enquiry', "Updated enquiry for: {$enquiry->name}", 'Success', ['enquiryId' => $enquiry->id]);
        return response()->json(['success' => true, 'data' => $enquiry]);
    }

    public function destroy($id)
    {
        $enquiry = Enquiry::find($id);
        if (!$enquiry) {
            return response()->json(['success' => false, 'message' => 'Enquiry not found'], 404);
        }
        $name = $enquiry->name;
        $enquiry->delete();
        AuditLogger::log(request(), 'Delete Customer Enquiry', "Deleted enquiry from: {$name}", 'Success', ['enquiryId' => $id]);
        return response()->json(['success' => true, 'message' => 'Enquiry deleted successfully']);
    }
}
