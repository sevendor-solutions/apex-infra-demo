<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class LoanPayment extends Model
{
    use HasFactory;

    protected $table = 'loan_payments';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'loanId',
        'paymentDate',
        'amount',
        'principalComponent',
        'interestComponent',
        'paymentMethod',
        'referenceNumber',
        'reference',
        'walletId',
        'accountName',
        'isInterestOnly',
        'notes',
        'userId',
    ];

    protected $casts = [
        'amount' => 'double',
        'principalComponent' => 'double',
        'interestComponent' => 'double',
        'isInterestOnly' => 'boolean',
    ];

    public function loan()
    {
        return $this->belongsTo(Loan::class, 'loanId');
    }

    protected static function booted()
    {
        static::creating(function ($item) {
            if (empty($item->id) || str_starts_with($item->id, 'lp_')) {
                $all = static::select('id')->get();
                $nextNum = 1;
                foreach ($all as $lp) {
                    if (preg_match('/^lp(\d+)$/', $lp->id, $matches)) {
                        $num = (int)$matches[1];
                        if ($num < 100000 && $num >= $nextNum) {
                            $nextNum = $num + 1;
                        }
                    }
                }
                $item->id = "lp{$nextNum}";
            }
        });
    }
}
