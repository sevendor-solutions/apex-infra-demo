<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class WalletTransaction extends Model
{
    use HasFactory;

    protected $table = 'wallet_transactions';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'walletId',
        'toWalletId',
        'type',
        'amount',
        'date',
        'paymentMode',
        'referenceNumber',
        'description',
        'receiptUrl',
        'userId',
    ];

    protected $casts = [
        'amount' => 'double',
    ];

    public function wallet()
    {
        return $this->belongsTo(Wallet::class, 'walletId');
    }

    protected static function booted()
    {
        static::creating(function ($item) {
            if (empty($item->id) || str_starts_with($item->id, 'wt_')) {
                $all = static::select('id')->get();
                $nextNum = 1;
                foreach ($all as $wt) {
                    if (preg_match('/^wt(\d+)$/', $wt->id, $matches)) {
                        $num = (int)$matches[1];
                        if ($num < 100000 && $num >= $nextNum) {
                            $nextNum = $num + 1;
                        }
                    }
                }
                $item->id = "wt{$nextNum}";
            }
        });
    }
}
