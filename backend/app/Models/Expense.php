<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Expense extends Model
{
    use HasFactory;

    protected $table = 'expenses';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'expenseNo',
        'party',
        'expenseCategory',
        'billDate',
        'paymentType',
        'stateOfSupply',
        'walletId',
        'accountName',
        'referenceNo',
        'roundOff',
        'totalAmount',
        'paidAmount',
        'pendingAmount',
        'paymentStatus',
        'notes',
        'location',
        'apartment',
        'projectName',
        'items',
        'lineItems',
        'userId',
    ];

    protected $casts = [
        'roundOff' => 'boolean',
        'totalAmount' => 'double',
        'paidAmount' => 'double',
        'pendingAmount' => 'double',
        'items' => 'array',
        'lineItems' => 'array',
    ];

    public function wallet()
    {
        return $this->belongsTo(Wallet::class, 'walletId');
    }
}
