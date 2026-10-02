<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Quotation;
use App\Services\AuditLogger;

class QuotationController extends Controller
{
    public function index()
    {
        $quotations = Quotation::orderBy('date', 'desc')->orderBy('createdAt', 'desc')->get();
        return response()->json(['success' => true, 'data' => $quotations]);
    }

    public function show($id)
    {
        $quotation = Quotation::find($id);
        if (!$quotation) {
            return response()->json(['success' => false, 'message' => 'Quotation not found'], 404);
        }
        return response()->json(['success' => true, 'data' => $quotation]);
    }

    public function store(Request $request)
    {
        $data = $request->all();
        if (empty($data['customerName']) || empty($data['customerMobile']) || empty($data['date']) || empty($data['validTillDate']) || empty($data['items'])) {
            return response()->json(['success' => false, 'message' => 'Required fields missing'], 400);
        }

        $count = Quotation::count();
        $data['quotationNumber'] = $data['quotationNumber'] ?? ('QT-JKFI-' . str_pad((string)(1001 + $count), 4, '0', STR_PAD_LEFT));
        $data['status'] = $data['status'] ?? 'Draft';

        $authUser = $request->attributes->get('auth_user');
        $data['userId'] = $authUser['id'] ?? null;

        $quotation = Quotation::create($data);
        AuditLogger::log($request, 'Create Quotation', "Created quotation: {$quotation->quotationNumber} for {$quotation->customerName}", 'Success', ['quotationId' => $quotation->id]);

        return response()->json(['success' => true, 'data' => $quotation], 201);
    }

    public function update(Request $request, $id)
    {
        $quotation = Quotation::find($id);
        if (!$quotation) {
            return response()->json(['success' => false, 'message' => 'Quotation not found'], 404);
        }

        $quotation->update($request->all());
        AuditLogger::log($request, 'Update Quotation', "Updated quotation: {$quotation->quotationNumber}", 'Success', ['quotationId' => $quotation->id]);

        return response()->json(['success' => true, 'data' => $quotation]);
    }

    public function destroy(Request $request, $id)
    {
        $quotation = Quotation::find($id);
        if (!$quotation) {
            return response()->json(['success' => false, 'message' => 'Quotation not found'], 404);
        }

        $num = $quotation->quotationNumber;
        $quotation->delete();
        AuditLogger::log($request, 'Delete Quotation', "Deleted quotation: {$num}", 'Success', ['quotationId' => $id]);

        return response()->json(['success' => true, 'message' => 'Quotation deleted successfully']);
    }
}
