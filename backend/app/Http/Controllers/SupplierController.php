<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Supplier;
use App\Services\AuditLogger;

class SupplierController extends Controller
{
    public function index()
    {
        $suppliers = Supplier::orderBy('name', 'asc')->get();
        return response()->json(['success' => true, 'data' => $suppliers]);
    }

    public function show($id)
    {
        $supplier = Supplier::find($id);
        if (!$supplier) {
            return response()->json(['success' => false, 'message' => 'Supplier not found'], 404);
        }
        return response()->json(['success' => true, 'data' => $supplier]);
    }

    public function store(Request $request)
    {
        $name = trim($request->input('name', ''));
        $contact = trim((string)$request->input('contactNumber', ''));

        if (!$name) {
            return response()->json(['success' => false, 'message' => 'Supplier name is required'], 400);
        }

        $query = Supplier::whereRaw('LOWER(name) = ?', [strtolower($name)]);
        if ($contact && $contact !== 'N/A') {
            $query->orWhere('contactNumber', $contact);
        }
        $existing = $query->first();

        if ($existing) {
            $field = ($contact && $existing->contactNumber === $contact) ? 'contact number' : 'name';
            return response()->json(['success' => false, 'message' => "A supplier with this {$field} already exists"], 400);
        }

        $authUser = $request->attributes->get('auth_user');
        $data = $request->all();
        $openingBalance = (float)($data['openingBalance'] ?? 0);
        $data['openingBalance'] = $openingBalance;
        $data['outstandingAmount'] = $openingBalance;
        $data['contactNumber'] = $contact ?: 'N/A';
        $data['userId'] = $authUser['id'] ?? null;

        $supplier = Supplier::create($data);
        AuditLogger::log($request, 'Create Supplier', "Created supplier account for: {$name}", 'Success', ['supplierId' => $supplier->id]);

        return response()->json(['success' => true, 'data' => $supplier], 201);
    }

    public function update(Request $request, $id)
    {
        $supplier = Supplier::find($id);
        if (!$supplier) {
            return response()->json(['success' => false, 'message' => 'Supplier not found'], 404);
        }

        $name = trim($request->input('name', ''));
        $contact = trim((string)$request->input('contactNumber', ''));

        if (($name && strtolower($name) !== strtolower($supplier->name)) || ($contact && $contact !== $supplier->contactNumber)) {
            $query = Supplier::where('id', '!=', $supplier->id);
            $query->where(function ($q) use ($name, $contact, $supplier) {
                if ($name && strtolower($name) !== strtolower($supplier->name)) $q->whereRaw('LOWER(name) = ?', [strtolower($name)]);
                if ($contact && $contact !== $supplier->contactNumber) $q->orWhere('contactNumber', $contact);
            });

            $existing = $query->first();
            if ($existing) {
                $field = ($contact && $existing->contactNumber === $contact) ? 'contact number' : 'name';
                return response()->json(['success' => false, 'message' => "Another supplier with this {$field} already exists"], 400);
            }
        }

        $supplier->update($request->all());
        AuditLogger::log($request, 'Update Supplier', "Updated details for supplier: {$supplier->name}", 'Success', ['supplierId' => $supplier->id]);

        return response()->json(['success' => true, 'data' => $supplier]);
    }

    public function destroy(Request $request, $id)
    {
        $supplier = Supplier::find($id);
        if (!$supplier) {
            return response()->json(['success' => false, 'message' => 'Supplier not found'], 404);
        }

        $name = $supplier->name;
        $supplier->delete();
        AuditLogger::log($request, 'Delete Supplier', "Deleted supplier account: {$name}", 'Success', ['supplierId' => $id]);

        return response()->json(['success' => true, 'message' => 'Supplier deleted successfully']);
    }
}
