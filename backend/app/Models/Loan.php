<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Loan extends Model
{
    use HasFactory;

    protected $table = 'loans';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'providerName',
        'accountNumber',
        'type',
        'amount',
        'interestRate',
        'startDate',
        'endDate',
        'emiAmount',
        'frequency',
        'paidAmount',
        'pendingAmount',
        'nextDueDate',
        'documentUrl',
        'userId',
    ];

    protected $casts = [
        'amount' => 'double',
        'interestRate' => 'double',
        'emiAmount' => 'double',
        'paidAmount' => 'double',
        'pendingAmount' => 'double',
    ];

    public function payments()
    {
        return $this->hasMany(LoanPayment::class, 'loanId');
    }

    protected static function booted()
    {
        static::creating(function ($item) {
            if (empty($item->id) || str_starts_with($item->id, 'l_')) {
                $all = static::select('id')->get();
                $nextNum = 1;
                foreach ($all as $l) {
                    if (preg_match('/^l(\d+)$/', $l->id, $matches)) {
                        $num = (int)$matches[1];
                        if ($num < 100000 && $num >= $nextNum) {
                            $nextNum = $num + 1;
                        }
                    }
                }
                $item->id = "l{$nextNum}";
            }
        });
    }
}
