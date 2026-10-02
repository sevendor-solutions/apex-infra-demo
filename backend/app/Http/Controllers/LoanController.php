<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Loan;
use App\Models\LoanPayment;
use App\Services\AuditLogger;

class LoanController extends Controller
{
    public function index()
    {
        $loans = Loan::orderBy('startDate', 'desc')->orderBy('createdAt', 'desc')->get();
        return response()->json(['success' => true, 'data' => $loans]);
    }

    public function show($id)
    {
        $loan = Loan::find($id);
        if (!$loan) {
            return response()->json(['success' => false, 'message' => 'Loan account not found'], 404);
        }
        return response()->json(['success' => true, 'data' => $loan]);
    }

    public function store(Request $request)
    {
        $data = $request->all();
        $isBorrowing = str_contains(strtolower($data['type'] ?? ''), 'borrowing');

        if ($isBorrowing) {
            if (empty($data['accountNumber'])) {
                $data['accountNumber'] = 'BORR-' . time() . '-' . random_int(1000, 9999);
            }
            if (empty($data['endDate'])) {
                $data['endDate'] = $data['startDate'] ?? date('Y-m-d');
            }
            $data['emiAmount'] = (float)($data['emiAmount'] ?? 0);
        }

        if (empty($data['providerName']) || empty($data['accountNumber']) || empty($data['type']) || !isset($data['amount'])) {
            return response()->json(['success' => false, 'message' => 'Required fields missing'], 400);
        }

        if (Loan::where('accountNumber', $data['accountNumber'])->exists()) {
            return response()->json(['success' => false, 'message' => "Loan Account Number \"{$data['accountNumber']}\" already exists"], 400);
        }

        $authUser = $request->attributes->get('auth_user');
        $amount = (float)$data['amount'];
        $data['amount'] = $amount;
        $data['paidAmount'] = 0;
        $data['pendingAmount'] = $amount;
        $data['interestRate'] = (float)($data['interestRate'] ?? 0);
        $data['emiAmount'] = (float)($data['emiAmount'] ?? 0);
        $data['userId'] = $authUser['id'] ?? null;

        $loan = Loan::create($data);
        AuditLogger::log($request, 'Create Loan', "Created loan account: {$loan->accountNumber} with {$loan->providerName}", 'Success', ['loanId' => $loan->id]);

        return response()->json(['success' => true, 'data' => $loan], 201);
    }

    public function update(Request $request, $id)
    {
        $loan = Loan::find($id);
        if (!$loan) {
            return response()->json(['success' => false, 'message' => 'Loan account not found'], 404);
        }

        $data = $request->all();
        if (isset($data['amount'])) {
            $data['amount'] = (float)$data['amount'];
            $data['pendingAmount'] = $data['amount'] - $loan->paidAmount;
        }

        $loan->update($data);
        AuditLogger::log($request, 'Update Loan', "Updated details for loan: {$loan->accountNumber}", 'Success', ['loanId' => $loan->id]);

        return response()->json(['success' => true, 'data' => $loan]);
    }

    public function destroy(Request $request, $id)
    {
        $loan = Loan::find($id);
        if (!$loan) {
            return response()->json(['success' => false, 'message' => 'Loan account not found'], 404);
        }

        $acc = $loan->accountNumber;
        $loan->delete();
        AuditLogger::log($request, 'Delete Loan', "Deleted loan account: {$acc}", 'Success', ['loanId' => $id]);

        return response()->json(['success' => true, 'message' => 'Loan deleted successfully']);
    }

    public function getPayments(Request $request)
    {
        $query = LoanPayment::query();
        if ($request->query('loanId')) {
            $query->where('loanId', $request->query('loanId'));
        }
        $payments = $query->orderBy('paymentDate', 'desc')->orderBy('created_at', 'desc')->get();
        return response()->json(['success' => true, 'data' => $payments]);
    }

    public function createPayment(Request $request)
    {
        $data = $request->all();
        $loanId = $data['loanId'] ?? null;
        $amount = (float)($data['amount'] ?? 0);

        if (!$loanId || $amount <= 0) {
            return response()->json(['success' => false, 'message' => 'Valid loan ID and payment amount required'], 400);
        }

        $loan = Loan::find($loanId);
        if (!$loan) {
            return response()->json(['success' => false, 'message' => 'Loan account not found'], 404);
        }

        $authUser = $request->attributes->get('auth_user');
        $data['userId'] = $authUser['id'] ?? null;

        $payment = LoanPayment::create($data);

        $loan->paidAmount += $amount;
        $loan->pendingAmount = max(0, $loan->amount - $loan->paidAmount);
        $loan->save();

        AuditLogger::log($request, 'Record Loan Payment', "Recorded EMI payment of ₹{$amount} for loan: {$loan->accountNumber}", 'Success');

        return response()->json(['success' => true, 'data' => $payment], 201);
    }

    public function payEmi(Request $request, $id)
    {
        $loan = Loan::find($id);
        if (!$loan) {
            return response()->json(['success' => false, 'message' => 'Loan account not found'], 404);
        }

        $amount = (float)$request->input('amount', 0);
        $paymentDate = $request->input('paymentDate', date('Y-m-d'));
        $reference = $request->input('reference', '');
        $walletId = $request->input('walletId');
        $isInterestOnly = (bool)$request->input('isInterestOnly', false);

        if ($amount <= 0) {
            return response()->json(['success' => false, 'message' => 'Valid positive payment amount required'], 400);
        }

        if (!$isInterestOnly) {
            $loan->paidAmount += $amount;
            $loan->pendingAmount = max(0, $loan->amount - $loan->paidAmount);
            $loan->save();
        }

        $accountName = null;
        $authUser = $request->attributes->get('auth_user');

        if ($walletId) {
            $wallet = \App\Models\Wallet::find($walletId);
            if ($wallet) {
                $wallet->currentBalance -= $amount;
                $wallet->save();
                $accountName = $wallet->name;

                \App\Models\WalletTransaction::create([
                    'walletId' => $walletId,
                    'type' => 'Debit',
                    'amount' => $amount,
                    'date' => $paymentDate,
                    'paymentMode' => 'Bank Transfer',
                    'referenceNumber' => $reference,
                    'description' => "EMI Payment for Loan A/c {$loan->accountNumber} ({$loan->providerName})",
                    'userId' => $authUser['id'] ?? null,
                ]);
            }
        }

        $payment = LoanPayment::create([
            'loanId' => $loan->id,
            'paymentDate' => $paymentDate,
            'amount' => $amount,
            'reference' => $reference,
            'walletId' => $walletId,
            'accountName' => $accountName,
            'isInterestOnly' => $isInterestOnly,
            'userId' => $authUser['id'] ?? null,
        ]);

        AuditLogger::log($request, 'Pay Loan EMI', "Recorded payment of ₹{$amount} for loan: {$loan->providerName}", 'Success', ['paymentId' => $payment->id]);

        return response()->json(['success' => true, 'data' => $payment, 'loan' => $loan], 201);
    }
}
