<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Wallet;
use App\Models\WalletTransaction;
use App\Services\AuditLogger;

class WalletController extends Controller
{
    public function index()
    {
        $wallets = Wallet::orderBy('name', 'asc')->get();
        return response()->json(['success' => true, 'data' => $wallets]);
    }

    public function show($id)
    {
        $wallet = Wallet::find($id);
        if (!$wallet) {
            return response()->json(['success' => false, 'message' => 'Wallet not found'], 404);
        }
        return response()->json(['success' => true, 'data' => $wallet]);
    }

    public function store(Request $request)
    {
        $name = trim($request->input('name', ''));
        $type = $request->input('type');
        $openingBalance = (float)$request->input('openingBalance', 0);

        if (!$name || !$type) {
            return response()->json(['success' => false, 'message' => 'Name and Type are required'], 400);
        }

        $exists = Wallet::whereRaw('LOWER(name) = ?', [strtolower($name)])->exists();
        if ($exists) {
            return response()->json(['success' => false, 'message' => "A wallet account with name \"{$name}\" already exists"], 400);
        }

        $authUser = $request->attributes->get('auth_user');

        $wallet = Wallet::create([
            'name' => $name,
            'type' => $type,
            'openingBalance' => $openingBalance,
            'currentBalance' => $openingBalance,
            'userId' => $authUser['id'] ?? null,
        ]);

        AuditLogger::log($request, 'Create Wallet', "Created wallet: {$name} ({$type})", 'Success', ['walletId' => $wallet->id]);
        return response()->json(['success' => true, 'data' => $wallet], 201);
    }

    public function update(Request $request, $id)
    {
        $wallet = Wallet::find($id);
        if (!$wallet) {
            return response()->json(['success' => false, 'message' => 'Wallet not found'], 404);
        }

        $name = trim($request->input('name', ''));
        $type = $request->input('type');

        if ($name && strtolower($name) !== strtolower($wallet->name)) {
            $exists = Wallet::where('id', '!=', $wallet->id)->whereRaw('LOWER(name) = ?', [strtolower($name)])->exists();
            if ($exists) {
                return response()->json(['success' => false, 'message' => "Another wallet account with name \"{$name}\" already exists"], 400);
            }
            $wallet->name = $name;
        }

        if ($type) $wallet->type = $type;
        $wallet->save();

        AuditLogger::log($request, 'Update Wallet', "Updated wallet details for: {$wallet->name}", 'Success', ['walletId' => $wallet->id]);
        return response()->json(['success' => true, 'data' => $wallet]);
    }

    public function destroy(Request $request, $id)
    {
        $wallet = Wallet::find($id);
        if (!$wallet) {
            return response()->json(['success' => false, 'message' => 'Wallet not found'], 404);
        }

        $name = $wallet->name;
        $wallet->delete();
        AuditLogger::log($request, 'Delete Wallet', "Deleted wallet: {$name}", 'Success');

        return response()->json(['success' => true, 'message' => 'Wallet deleted successfully']);
    }

    public function getTransactions(Request $request)
    {
        $query = WalletTransaction::with('wallet');
        if ($request->query('walletId')) {
            $query->where('walletId', $request->query('walletId'));
        }
        $txns = $query->orderBy('date', 'desc')->orderBy('created_at', 'desc')->get();
        return response()->json(['success' => true, 'data' => $txns]);
    }

    public function transfer(Request $request)
    {
        $fromWalletId = $request->input('fromWalletId');
        $toWalletId = $request->input('toWalletId');
        $amount = (float)$request->input('amount', 0);
        $date = $request->input('date', date('Y-m-d'));
        $description = $request->input('description', 'Inter-wallet transfer');

        if (!$fromWalletId || !$toWalletId || $amount <= 0) {
            return response()->json(['success' => false, 'message' => 'Valid source, destination wallets and positive amount required'], 400);
        }

        $from = Wallet::find($fromWalletId);
        $to = Wallet::find($toWalletId);

        if (!$from || !$to) {
            return response()->json(['success' => false, 'message' => 'One or both wallets not found'], 404);
        }

        $from->currentBalance -= $amount;
        $from->save();

        $to->currentBalance += $amount;
        $to->save();

        $authUser = $request->attributes->get('auth_user');

        WalletTransaction::create([
            'walletId' => $fromWalletId,
            'type' => 'Debit',
            'amount' => $amount,
            'date' => $date,
            'paymentMode' => 'Transfer',
            'description' => "Transferred ₹{$amount} to {$to->name}. Notes: {$description}",
            'userId' => $authUser['id'] ?? null,
        ]);

        WalletTransaction::create([
            'walletId' => $toWalletId,
            'type' => 'Credit',
            'amount' => $amount,
            'date' => $date,
            'paymentMode' => 'Transfer',
            'description' => "Received ₹{$amount} from {$from->name}. Notes: {$description}",
            'userId' => $authUser['id'] ?? null,
        ]);

        AuditLogger::log($request, 'Wallet Transfer', "Transferred ₹{$amount} from {$from->name} to {$to->name}", 'Success');

        return response()->json(['success' => true, 'message' => 'Transfer completed successfully']);
    }

    public function addMoney(Request $request)
    {
        $walletId = $request->input('walletId');
        $amount = (float)$request->input('amount', 0);
        $date = $request->input('date', date('Y-m-d'));
        $paymentMode = $request->input('paymentMode', 'Cash');
        $referenceNumber = $request->input('referenceNumber');
        $description = $request->input('description');
        $receiptUrl = $request->input('receiptUrl');

        if (!$walletId || $amount <= 0) {
            return response()->json(['success' => false, 'message' => 'Valid wallet and positive amount required'], 400);
        }

        $wallet = Wallet::find($walletId);
        if (!$wallet) {
            return response()->json(['success' => false, 'message' => 'Wallet not found'], 404);
        }

        $wallet->currentBalance += $amount;
        $wallet->save();

        $authUser = $request->attributes->get('auth_user');

        $transaction = WalletTransaction::create([
            'walletId' => $walletId,
            'type' => 'Credit',
            'amount' => $amount,
            'date' => $date,
            'paymentMode' => $paymentMode,
            'referenceNumber' => $referenceNumber,
            'description' => $description,
            'receiptUrl' => $receiptUrl,
            'userId' => $authUser['id'] ?? null,
        ]);

        AuditLogger::log($request, 'Wallet Credit', "Credited ₹{$amount} to wallet: {$wallet->name}", 'Success', ['transactionId' => $transaction->id]);
        return response()->json(['success' => true, 'data' => $transaction, 'wallet' => $wallet], 201);
    }

    public function withdrawMoney(Request $request)
    {
        $walletId = $request->input('walletId');
        $amount = (float)$request->input('amount', 0);
        $date = $request->input('date', date('Y-m-d'));
        $paymentMode = $request->input('paymentMode', 'Cash');
        $referenceNumber = $request->input('referenceNumber');
        $description = $request->input('description');
        $receiptUrl = $request->input('receiptUrl');

        if (!$walletId || $amount <= 0) {
            return response()->json(['success' => false, 'message' => 'Valid wallet and positive amount required'], 400);
        }

        $wallet = Wallet::find($walletId);
        if (!$wallet) {
            return response()->json(['success' => false, 'message' => 'Wallet not found'], 404);
        }

        $wallet->currentBalance -= $amount;
        $wallet->save();

        $authUser = $request->attributes->get('auth_user');

        $transaction = WalletTransaction::create([
            'walletId' => $walletId,
            'type' => 'Debit',
            'amount' => $amount,
            'date' => $date,
            'paymentMode' => $paymentMode,
            'referenceNumber' => $referenceNumber,
            'description' => $description,
            'receiptUrl' => $receiptUrl,
            'userId' => $authUser['id'] ?? null,
        ]);

        AuditLogger::log($request, 'Wallet Debit', "Debited ₹{$amount} from wallet: {$wallet->name}", 'Success', ['transactionId' => $transaction->id]);
        return response()->json(['success' => true, 'data' => $transaction, 'wallet' => $wallet], 201);
    }
}
