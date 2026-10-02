<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Expense;
use App\Models\Wallet;
use App\Models\WalletTransaction;
use App\Services\AccountingLogger;
use App\Services\AuditLogger;

class ExpenseController extends Controller
{
    public function index()
    {
        $expenses = Expense::orderBy('createdAt', 'desc')->orderBy('billDate', 'desc')->get();
        return response()->json(['success' => true, 'data' => $expenses]);
    }

    public function show($id)
    {
        $expense = Expense::find($id);
        if (!$expense) {
            return response()->json(['success' => false, 'message' => 'Expense not found'], 404);
        }
        return response()->json(['success' => true, 'data' => $expense]);
    }

    public function store(Request $request)
    {
        $all = Expense::select('id')->get();
        $nextNum = 1;
        foreach ($all as $e) {
            if (preg_match('/^exp(\d+)$/', $e->id, $matches)) {
                $num = (int)$matches[1];
                if ($num >= $nextNum) $nextNum = $num + 1;
            }
        }

        $data = $request->except(['id']);
        $totalAmt = (float)($data['totalAmount'] ?? 0);
        $paidAmt = isset($data['paidAmount']) ? (float)$data['paidAmount'] : $totalAmt;
        if (($data['paymentType'] ?? '') === 'Credit' && !isset($data['paidAmount'])) {
            $paidAmt = 0;
        }

        $pendingAmt = $totalAmt - $paidAmt;
        $payStatus = 'Paid';
        if ($paidAmt <= 0) {
            $payStatus = 'Unpaid';
        } elseif ($pendingAmt > 0) {
            $payStatus = 'Partially Paid';
        }

        $accountName = $data['accountName'] ?? null;
        $walletId = $data['walletId'] ?? null;
        $authUser = $request->attributes->get('auth_user');

        if ($walletId && $paidAmt > 0) {
            $wallet = Wallet::find($walletId);
            if ($wallet) {
                $wallet->currentBalance -= $paidAmt;
                $wallet->save();
                $accountName = $wallet->name;

                WalletTransaction::create([
                    'walletId' => $walletId,
                    'type' => 'Debit',
                    'amount' => $paidAmt,
                    'date' => $data['billDate'] ?? date('Y-m-d'),
                    'paymentMode' => $data['paymentType'] ?? 'Cash',
                    'referenceNumber' => $data['referenceNo'] ?? null,
                    'description' => "Paid expense: {$data['party']} ({$data['expenseCategory']})",
                    'userId' => $authUser['id'] ?? null,
                ]);
            }
        }

        $data['id'] = "exp{$nextNum}";
        $data['paidAmount'] = $paidAmt;
        $data['pendingAmount'] = $pendingAmt;
        $data['paymentStatus'] = $payStatus;
        $data['accountName'] = $accountName;
        $data['userId'] = $authUser['id'] ?? null;

        $newExpense = Expense::create($data);

        AccountingLogger::log(
            $request,
            'Expenses',
            'INSERT',
            $newExpense->expenseNo ?: $newExpense->id,
            $newExpense->totalAmount,
            "Created Expense Bill #{$newExpense->expenseNo} for party \"{$newExpense->party}\" ({$newExpense->expenseCategory}) - Total: ₹{$newExpense->totalAmount}, Paid: ₹{$newExpense->paidAmount}"
        );

        return response()->json(['success' => true, 'data' => $newExpense], 201);
    }

    public function update(Request $request, $id)
    {
        $expense = Expense::find($id);
        if (!$expense) {
            return response()->json(['success' => false, 'message' => 'Expense not found'], 404);
        }

        $data = $request->except(['id']);
        $totalAmt = (float)($data['totalAmount'] ?? 0);
        $paidAmt = isset($data['paidAmount']) ? (float)$data['paidAmount'] : $totalAmt;
        if (($data['paymentType'] ?? '') === 'Credit' && !isset($data['paidAmount'])) {
            $paidAmt = 0;
        }

        $pendingAmt = $totalAmt - $paidAmt;
        $payStatus = 'Paid';
        if ($paidAmt <= 0) {
            $payStatus = 'Unpaid';
        } elseif ($pendingAmt > 0) {
            $payStatus = 'Partially Paid';
        }

        // Revert old wallet balance
        if ($expense->walletId && $expense->paidAmount > 0) {
            $oldWallet = Wallet::find($expense->walletId);
            if ($oldWallet) {
                $oldWallet->currentBalance += $expense->paidAmount;
                $oldWallet->save();
            }
        }

        $accountName = $data['accountName'] ?? null;
        $walletId = $data['walletId'] ?? null;
        $authUser = $request->attributes->get('auth_user');

        if ($walletId && $paidAmt > 0) {
            $newWallet = Wallet::find($walletId);
            if ($newWallet) {
                $newWallet->currentBalance -= $paidAmt;
                $newWallet->save();
                $accountName = $newWallet->name;

                WalletTransaction::create([
                    'walletId' => $walletId,
                    'type' => 'Debit',
                    'amount' => $paidAmt,
                    'date' => $data['billDate'] ?? date('Y-m-d'),
                    'paymentMode' => $data['paymentType'] ?? 'Cash',
                    'referenceNumber' => $data['referenceNo'] ?? null,
                    'description' => "Updated expense: {$data['party']} ({$data['expenseCategory']})",
                    'userId' => $authUser['id'] ?? null,
                ]);
            }
        }

        $data['paidAmount'] = $paidAmt;
        $data['pendingAmount'] = $pendingAmt;
        $data['paymentStatus'] = $payStatus;
        $data['accountName'] = $accountName;

        $expense->update($data);

        AccountingLogger::log(
            $request,
            'Expenses',
            'UPDATE',
            $expense->expenseNo ?: $expense->id,
            $totalAmt,
            "Updated Expense Bill #{$expense->expenseNo} for party \"{$expense->party}\" ({$expense->expenseCategory}) - Total: ₹{$totalAmt}, Paid: ₹{$paidAmt}, Status: {$payStatus}"
        );

        return response()->json(['success' => true, 'data' => $expense]);
    }

    public function destroy(Request $request, $id)
    {
        $expense = Expense::find($id);
        if (!$expense) {
            return response()->json(['success' => false, 'message' => 'Expense not found'], 404);
        }

        $billNo = $expense->expenseNo ?: $expense->id;
        $party = $expense->party;
        $total = $expense->totalAmount;
        $authUser = $request->attributes->get('auth_user');

        if ($expense->walletId && $expense->paidAmount > 0) {
            $wallet = Wallet::find($expense->walletId);
            if ($wallet) {
                $wallet->currentBalance += $expense->paidAmount;
                $wallet->save();

                WalletTransaction::create([
                    'walletId' => $expense->walletId,
                    'type' => 'Credit',
                    'amount' => $expense->paidAmount,
                    'date' => date('Y-m-d'),
                    'paymentMode' => $expense->paymentType ?: 'Cash',
                    'description' => "Deleted expense: {$expense->party} ({$expense->expenseCategory})",
                    'userId' => $authUser['id'] ?? null,
                ]);
            }
        }

        $expense->delete();

        AccountingLogger::log(
            $request,
            'Expenses',
            'DELETE',
            $billNo,
            $total,
            "Deleted Expense Bill #{$billNo} of party: \"{$party}\" - Total: ₹{$total}"
        );

        return response()->json(['success' => true, 'message' => 'Expense deleted']);
    }
}
