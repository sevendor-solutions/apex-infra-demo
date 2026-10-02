<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Wallet extends Model
{
    use HasFactory;

    protected $table = 'wallets';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'name',
        'openingBalance',
        'currentBalance',
        'type',
        'userId',
    ];

    protected $casts = [
        'openingBalance' => 'double',
        'currentBalance' => 'double',
    ];

    public function transactions()
    {
        return $this->hasMany(WalletTransaction::class, 'walletId');
    }

    protected static function booted()
    {
        static::creating(function ($item) {
            if (empty($item->id) || str_starts_with($item->id, 'w_')) {
                $all = static::select('id')->get();
                $nextNum = 1;
                foreach ($all as $w) {
                    if (preg_match('/^w(\d+)$/', $w->id, $matches)) {
                        $num = (int)$matches[1];
                        if ($num < 100000 && $num >= $nextNum) {
                            $nextNum = $num + 1;
                        }
                    }
                }
                $item->id = "w{$nextNum}";
            }
        });
    }
}
