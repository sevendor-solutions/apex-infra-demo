<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PaymentOut extends Model
{
    use HasFactory;

    protected $table = 'payments_out';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'supplierName',
        'billNumber',
        'paymentDate',
        'amount',
        'paymentMethod',
        'walletId',
        'accountName',
        'referenceNumber',
        'receiptNo',
        'status',
        'unusedAmount',
        'linkedTxns',
        'attachmentUrl',
        'notes',
        'userId',
    ];

    protected $casts = [
        'amount' => 'double',
        'unusedAmount' => 'double',
        'linkedTxns' => 'array',
    ];

    protected static function booted()
    {
        static::creating(function ($item) {
            if (empty($item->id) || str_starts_with($item->id, 'po_')) {
                $all = static::select('id')->get();
                $nextNum = 1;
                foreach ($all as $po) {
                    if (preg_match('/^po(\d+)$/', $po->id, $matches)) {
                        $num = (int)$matches[1];
                        if ($num < 100000 && $num >= $nextNum) {
                            $nextNum = $num + 1;
                        }
                    }
                }
                $item->id = "po{$nextNum}";
            }
        });
    }
}
