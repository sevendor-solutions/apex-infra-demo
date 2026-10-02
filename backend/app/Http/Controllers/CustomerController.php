<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Customer;
use App\Services\AuditLogger;

class CustomerController extends Controller
{
    public function index()
    {
        $customers = Customer::orderBy('name', 'asc')->get();
        return response()->json(['success' => true, 'data' => $customers]);
    }

    public function show($id)
    {
        $customer = Customer::find($id);
        if (!$customer) {
            return response()->json(['success' => false, 'message' => 'Customer not found'], 404);
        }
        return response()->json(['success' => true, 'data' => $customer]);
    }

    public function store(Request $request)
    {
        $name = trim($request->input('name', ''));
        $mobile = trim($request->input('mobile', ''));
        $email = trim($request->input('email', ''));

        if (!$name || !$mobile) {
            return response()->json(['success' => false, 'message' => 'Name and Mobile number are required'], 400);
        }

        $query = Customer::where('mobile', $mobile);
        if ($email) {
            $query->orWhereRaw('LOWER(email) = ?', [strtolower($email)]);
        }
        $existing = $query->first();

        if ($existing) {
            $field = ($existing->mobile === $mobile) ? 'mobile number' : 'email address';
            return response()->json(['success' => false, 'message' => "A customer with this {$field} already exists"], 400);
        }

        $authUser = $request->attributes->get('auth_user');
        $data = $request->all();
        $openingBalance = (float)($data['openingBalance'] ?? 0);
        $data['openingBalance'] = $openingBalance;
        $data['outstandingAmount'] = $openingBalance;
        $data['creditLimit'] = (float)($data['creditLimit'] ?? 0);
        $data['userId'] = $authUser['id'] ?? null;

        $customer = Customer::create($data);
        AuditLogger::log($request, 'Create Customer', "Created customer account for: {$name}", 'Success', ['customerId' => $customer->id]);

        return response()->json(['success' => true, 'data' => $customer], 201);
    }

    public function update(Request $request, $id)
    {
        $customer = Customer::find($id);
        if (!$customer) {
            return response()->json(['success' => false, 'message' => 'Customer not found'], 404);
        }

        $mobile = trim($request->input('mobile', ''));
        $email = trim($request->input('email', ''));

        if (($mobile && $mobile !== $customer->mobile) || ($email && strtolower($email) !== strtolower($customer->email ?? ''))) {
            $query = Customer::where('id', '!=', $customer->id);
            $query->where(function ($q) use ($mobile, $email, $customer) {
                if ($mobile && $mobile !== $customer->mobile) $q->where('mobile', $mobile);
                if ($email && strtolower($email) !== strtolower($customer->email ?? '')) $q->orWhereRaw('LOWER(email) = ?', [strtolower($email)]);
            });

            $existing = $query->first();
            if ($existing) {
                $field = ($mobile && $existing->mobile === $mobile) ? 'mobile number' : 'email address';
                return response()->json(['success' => false, 'message' => "Another customer with this {$field} already exists"], 400);
            }
        }

        $customer->update($request->all());
        AuditLogger::log($request, 'Update Customer', "Updated details for customer: {$customer->name}", 'Success', ['customerId' => $customer->id]);

        return response()->json(['success' => true, 'data' => $customer]);
    }

    public function destroy(Request $request, $id)
    {
        $customer = Customer::find($id);
        if (!$customer) {
            return response()->json(['success' => false, 'message' => 'Customer not found'], 404);
        }

        $name = $customer->name;
        $customer->delete();
        AuditLogger::log($request, 'Delete Customer', "Deleted customer account: {$name}", 'Success', ['customerId' => $id]);

        return response()->json(['success' => true, 'message' => 'Customer deleted successfully']);
    }
}
