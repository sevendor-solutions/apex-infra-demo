<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\PaymentIn;
use App\Models\PaymentOut;
use App\Models\Customer;
use App\Models\Supplier;
use App\Models\Invoice;
use App\Models\Expense;
use App\Models\Wallet;
use App\Models\WalletTransaction;
use App\Services\AccountingLogger;
use App\Services\AuditLogger;

class PaymentController extends Controller
{
    // === PAYMENTS IN (RECEIVABLES) ===
    public function getPaymentsIn()
    {
        $payments = PaymentIn::orderBy('paymentDate', 'desc')->orderBy('created_at', 'desc')->get();
        return response()->json(['success' => true, 'data' => $payments]);
    }

    public function storePaymentIn(Request $request)
    {
        $data = $request->all();
        if (empty($data['customerName']) || empty($data['paymentDate']) || empty($data['amount']) || empty($data['paymentMethod'])) {
            return response()->json(['success' => false, 'message' => 'Required fields missing'], 400);
        }

        $payAmt = (float)$data['amount'];
        $walletId = $data['walletId'] ?? null;
        $accountName = 'Cash';
        $authUser = $request->attributes->get('auth_user');

        if ($walletId) {
            $wallet = Wallet::find($walletId);
            if ($wallet) {
                $wallet->currentBalance += $payAmt;
                $wallet->save();
                $accountName = $wallet->name;

                WalletTransaction::create([
                    'walletId' => $walletId,
                    'type' => 'Credit',
                    'amount' => $payAmt,
                    'date' => $data['paymentDate'],
                    'paymentMode' => $data['paymentMethod'],
                    'referenceNumber' => $data['referenceNumber'] ?? null,
                    'description' => "Payment In #" . ($data['receiptNo'] ?? '') . " from customer {$data['customerName']}",
                    'userId' => $authUser['id'] ?? null,
                ]);
            }
        }

        // Reduce customer balance
        $customer = Customer::where('name', $data['customerName'])->first();
        if ($customer) {
            $customer->outstandingAmount = max(0, $customer->outstandingAmount - $payAmt);
            $customer->save();
        }

        // Allocate across linked invoices
        if (!empty($data['linkedTxns'])) {
            $txns = is_string($data['linkedTxns']) ? json_decode($data['linkedTxns'], true) : $data['linkedTxns'];
            if (is_array($txns)) {
                foreach ($txns as $item) {
                    $linkAmt = (float)($item['linkedAmount'] ?? 0);
                    if ($linkAmt > 0) {
                        $inv = !empty($item['txnId']) ? Invoice::find($item['txnId']) : null;
                        if (!$inv && !empty($item['refNo'])) {
                            $inv = Invoice::where('invoiceNumber', $item['refNo'])->first();
                        }
                        if ($inv) {
                            $inv->paidAmount += $linkAmt;
                            $inv->pendingAmount = max(0, $inv->totalAmount - $inv->paidAmount);
                            $inv->paymentStatus = ($inv->paidAmount >= $inv->totalAmount) ? 'Paid' : 'Partial';
                            $inv->save();
                        }
                    }
                }
            }
        } elseif (!empty($data['invoiceNumber'])) {
            $inv = Invoice::where('invoiceNumber', $data['invoiceNumber'])->first();
            if ($inv) {
                $inv->paidAmount += $payAmt;
                $inv->pendingAmount = max(0, $inv->totalAmount - $inv->paidAmount);
                $inv->paymentStatus = ($inv->paidAmount >= $inv->totalAmount) ? 'Paid' : 'Partial';
                $inv->save();
            }
        }

        $data['amount'] = $payAmt;
        $data['accountName'] = $accountName;
        $data['userId'] = $authUser['id'] ?? null;

        $payment = PaymentIn::create($data);

        AccountingLogger::log(
            $request,
            'Payments In',
            'INSERT',
            $payment->receiptNo ?: $payment->id,
            $payAmt,
            "Received Payment In #" . ($payment->receiptNo ?: $payment->id) . " of ₹{$payAmt} from customer: \"{$payment->customerName}\" via {$payment->paymentMethod}"
        );

        return response()->json(['success' => true, 'data' => $payment], 201);
    }

    public function updatePaymentIn(Request $request, $id)
    {
        $payment = PaymentIn::find($id);
        if (!$payment) {
            return response()->json(['success' => false, 'message' => 'Payment In record not found'], 404);
        }

        $payment->update($request->all());
        return response()->json(['success' => true, 'data' => $payment]);
    }

    public function destroyPaymentIn(Request $request, $id)
    {
        $payment = PaymentIn::find($id);
        if (!$payment) {
            return response()->json(['success' => false, 'message' => 'Payment In record not found'], 404);
        }

        $amt = $payment->amount;
        $customerName = $payment->customerName;

        // Revert wallet
        if ($payment->walletId && $amt > 0) {
            $wallet = Wallet::find($payment->walletId);
            if ($wallet) {
                $wallet->currentBalance -= $amt;
                $wallet->save();
            }
        }

        // Revert customer balance
        $customer = Customer::where('name', $customerName)->first();
        if ($customer) {
            $customer->outstandingAmount += $amt;
            $customer->save();
        }

        $payment->delete();

        AccountingLogger::log(
            $request,
            'Payments In',
            'DELETE',
            $payment->receiptNo ?: $payment->id,
            $amt,
            "Deleted Payment In #" . ($payment->receiptNo ?: $payment->id) . " of ₹{$amt} from customer: \"{$customerName}\""
        );

        return response()->json(['success' => true, 'message' => 'Payment In deleted successfully']);
    }

    // === PAYMENTS OUT (PAYABLES) ===
    public function getPaymentsOut()
    {
        $payments = PaymentOut::orderBy('paymentDate', 'desc')->orderBy('created_at', 'desc')->get();
        return response()->json(['success' => true, 'data' => $payments]);
    }

    public function storePaymentOut(Request $request)
    {
        $data = $request->all();
        if (empty($data['supplierName']) || empty($data['paymentDate']) || empty($data['amount']) || empty($data['paymentMethod'])) {
            return response()->json(['success' => false, 'message' => 'Required fields missing'], 400);
        }

        $payAmt = (float)$data['amount'];
        $walletId = $data['walletId'] ?? null;
        $accountName = 'Cash';
        $authUser = $request->attributes->get('auth_user');

        if ($walletId) {
            $wallet = Wallet::find($walletId);
            if ($wallet) {
                $wallet->currentBalance -= $payAmt;
                $wallet->save();
                $accountName = $wallet->name;

                WalletTransaction::create([
                    'walletId' => $walletId,
                    'type' => 'Debit',
                    'amount' => $payAmt,
                    'date' => $data['paymentDate'],
                    'paymentMode' => $data['paymentMethod'],
                    'referenceNumber' => $data['referenceNumber'] ?? null,
                    'description' => "Payment Out #" . ($data['receiptNo'] ?? '') . " to supplier {$data['supplierName']}",
                    'userId' => $authUser['id'] ?? null,
                ]);
            }
        }

        // Reduce supplier balance
        $supplier = Supplier::where('name', $data['supplierName'])->first();
        if ($supplier) {
            $supplier->outstandingAmount = max(0, $supplier->outstandingAmount - $payAmt);
            $supplier->save();
        }

        $data['amount'] = $payAmt;
        $data['accountName'] = $accountName;
        $data['userId'] = $authUser['id'] ?? null;

        $payment = PaymentOut::create($data);

        AccountingLogger::log(
            $request,
            'Payments Out',
            'INSERT',
            $payment->receiptNo ?: $payment->id,
            $payAmt,
            "Recorded Payment Out #" . ($payment->receiptNo ?: $payment->id) . " of ₹{$payAmt} to supplier: \"{$payment->supplierName}\" via {$payment->paymentMethod}"
        );

        return response()->json(['success' => true, 'data' => $payment], 201);
    }

    public function updatePaymentOut(Request $request, $id)
    {
        $payment = PaymentOut::find($id);
        if (!$payment) {
            return response()->json(['success' => false, 'message' => 'Payment Out record not found'], 404);
        }

        $payment->update($request->all());
        return response()->json(['success' => true, 'data' => $payment]);
    }

    public function destroyPaymentOut(Request $request, $id)
    {
        $payment = PaymentOut::find($id);
        if (!$payment) {
            return response()->json(['success' => false, 'message' => 'Payment Out record not found'], 404);
        }

        $amt = $payment->amount;
        $supplierName = $payment->supplierName;

        // Revert wallet
        if ($payment->walletId && $amt > 0) {
            $wallet = Wallet::find($payment->walletId);
            if ($wallet) {
                $wallet->currentBalance += $amt;
                $wallet->save();
            }
        }

        // Revert supplier balance
        $supplier = Supplier::where('name', $supplierName)->first();
        if ($supplier) {
            $supplier->outstandingAmount += $amt;
            $supplier->save();
        }

        $payment->delete();

        AccountingLogger::log(
            $request,
            'Payments Out',
            'DELETE',
            $payment->receiptNo ?: $payment->id,
            $amt,
            "Deleted Payment Out #" . ($payment->receiptNo ?: $payment->id) . " of ₹{$amt} to supplier: \"{$supplierName}\""
        );

        return response()->json(['success' => true, 'message' => 'Payment Out deleted successfully']);
    }

    public function getPending()
    {
        $pendingInvoices = Invoice::whereIn('paymentStatus', ['Unpaid', 'Partial'])
            ->orderBy('date', 'asc')
            ->get();

        $pendingSuppliers = Supplier::where('outstandingAmount', '>', 0)
            ->orderBy('name', 'asc')
            ->get();

        return response()->json([
            'success' => true,
            'data' => [
                'customerPending' => $pendingInvoices,
                'supplierPending' => $pendingSuppliers,
            ]
        ]);
    }
}
