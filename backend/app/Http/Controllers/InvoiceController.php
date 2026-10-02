<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Invoice;
use App\Models\Customer;
use App\Models\Quotation;
use App\Models\InventoryItem;
use App\Models\StockMovement;
use App\Services\AccountingLogger;
use App\Services\AuditLogger;

class InvoiceController extends Controller
{
    public function index()
    {
        $invoices = Invoice::orderBy('date', 'desc')->orderBy('createdAt', 'desc')->get();
        return response()->json(['success' => true, 'data' => $invoices]);
    }

    public function show($id)
    {
        $invoice = Invoice::find($id);
        if (!$invoice) {
            return response()->json(['success' => false, 'message' => 'Invoice not found'], 404);
        }
        return response()->json(['success' => true, 'data' => $invoice]);
    }

    public function store(Request $request)
    {
        $data = $request->all();
        if (empty($data['customerName']) || empty($data['date']) || empty($data['items'])) {
            return response()->json(['success' => false, 'message' => 'Required fields missing'], 400);
        }

        $count = Invoice::count();
        $data['invoiceNumber'] = $data['invoiceNumber'] ?? ('INV-JKFI-' . str_pad((string)(1001 + $count), 4, '0', STR_PAD_LEFT));

        $total = (float)($data['totalAmount'] ?? 0);
        $paid = (float)($data['paidAmount'] ?? 0);
        $pending = $total - $paid;

        $paymentStatus = 'Unpaid';
        if ($paid >= $total && $total > 0) $paymentStatus = 'Paid';
        elseif ($paid > 0) $paymentStatus = 'Partial';

        $authUser = $request->attributes->get('auth_user');

        $data['totalAmount'] = $total;
        $data['paidAmount'] = $paid;
        $data['pendingAmount'] = $pending;
        $data['paymentStatus'] = $paymentStatus;
        $data['gstAmount'] = (float)($data['gstAmount'] ?? 0);
        $data['discountAmount'] = (float)($data['discountAmount'] ?? 0);
        $data['userId'] = $authUser['id'] ?? null;

        $invoice = Invoice::create($data);

        // Link quotation
        if (!empty($data['quotationId'])) {
            $q = Quotation::find($data['quotationId']);
            if ($q && $q->status !== 'Converted') {
                $q->status = 'Converted';
                $q->convertedInvoiceId = $invoice->id;
                $q->convertedInvoiceNumber = $invoice->invoiceNumber;
                $q->save();
            }
        } elseif (!empty($data['quotationNumber'])) {
            $q = Quotation::where('quotationNumber', $data['quotationNumber'])->first();
            if ($q && $q->status !== 'Converted') {
                $q->status = 'Converted';
                $q->convertedInvoiceId = $invoice->id;
                $q->convertedInvoiceNumber = $invoice->invoiceNumber;
                $q->save();
            }
        }

        // Update customer balance
        $customer = Customer::where('name', $data['customerName'])->first();
        if ($customer) {
            $customer->outstandingAmount += $pending;
            $customer->save();
        }

        // Deduct inventory items stock
        if (is_array($data['items'])) {
            foreach ($data['items'] as $itemData) {
                $code = $itemData['code'] ?? null;
                $qty = (float)($itemData['quantity'] ?? 0);
                if ($code && $qty > 0) {
                    $invItem = InventoryItem::where('code', $code)->first();
                    if ($invItem) {
                        $invItem->currentStock -= $qty;
                        $invItem->save();

                        StockMovement::create([
                            'productCode' => $code,
                            'type' => 'Stock Out',
                            'quantity' => $qty,
                            'date' => $data['date'],
                            'warehouse' => $invItem->warehouseLocation ?? 'Main Warehouse',
                            'notes' => "Invoice sale #{$invoice->invoiceNumber}",
                            'userId' => $authUser['id'] ?? null,
                        ]);
                    }
                }
            }
        }

        AccountingLogger::log(
            $request,
            'Invoices',
            'INSERT',
            $invoice->invoiceNumber,
            $invoice->totalAmount,
            "Created Invoice #{$invoice->invoiceNumber} for customer \"{$invoice->customerName}\" - Total: ₹{$invoice->totalAmount}, Pending: ₹{$invoice->pendingAmount}"
        );

        return response()->json(['success' => true, 'data' => $invoice], 201);
    }

    public function update(Request $request, $id)
    {
        $invoice = Invoice::find($id);
        if (!$invoice) {
            return response()->json(['success' => false, 'message' => 'Invoice not found'], 404);
        }

        $data = $request->all();
        $total = isset($data['totalAmount']) ? (float)$data['totalAmount'] : $invoice->totalAmount;
        $paid = isset($data['paidAmount']) ? (float)$data['paidAmount'] : $invoice->paidAmount;
        $pending = $total - $paid;

        $paymentStatus = 'Unpaid';
        if ($paid >= $total && $total > 0) $paymentStatus = 'Paid';
        elseif ($paid > 0) $paymentStatus = 'Partial';

        $data['totalAmount'] = $total;
        $data['paidAmount'] = $paid;
        $data['pendingAmount'] = $pending;
        $data['paymentStatus'] = $paymentStatus;

        $oldPending = $invoice->pendingAmount;
        $diff = $pending - $oldPending;

        $invoice->update($data);

        if ($diff != 0) {
            $customer = Customer::where('name', $invoice->customerName)->first();
            if ($customer) {
                $customer->outstandingAmount += $diff;
                $customer->save();
            }
        }

        AccountingLogger::log(
            $request,
            'Invoices',
            'UPDATE',
            $invoice->invoiceNumber,
            $total,
            "Updated Invoice #{$invoice->invoiceNumber} for customer \"{$invoice->customerName}\" - Total: ₹{$total}, Paid: ₹{$paid}, Status: {$paymentStatus}"
        );

        return response()->json(['success' => true, 'data' => $invoice]);
    }

    public function destroy(Request $request, $id)
    {
        $invoice = Invoice::find($id);
        if (!$invoice) {
            return response()->json(['success' => false, 'message' => 'Invoice not found'], 404);
        }

        $num = $invoice->invoiceNumber;
        $custName = $invoice->customerName;
        $total = $invoice->totalAmount;
        $pending = $invoice->pendingAmount;

        // Restore customer balance
        $customer = Customer::where('name', $custName)->first();
        if ($customer) {
            $customer->outstandingAmount = max(0, $customer->outstandingAmount - $pending);
            $customer->save();
        }

        $invoice->delete();

        AccountingLogger::log(
            $request,
            'Invoices',
            'DELETE',
            $num,
            $total,
            "Deleted Invoice #{$num} of customer: \"{$custName}\" - Total: ₹{$total}"
        );

        return response()->json(['success' => true, 'message' => 'Invoice deleted successfully']);
    }
}
