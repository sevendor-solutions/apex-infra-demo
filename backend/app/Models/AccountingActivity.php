<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AccountingActivity extends Model
{
    use HasFactory;

    protected $table = 'accounting_activities';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'dateTime',
        'module',
        'activityType',
        'recordId',
        'amount',
        'description',
        'userId',
        'userName',
        'userRole',
        'ipAddress',
        'metadata',
    ];

    protected $casts = [
        'dateTime' => 'datetime',
        'amount' => 'double',
    ];

    protected static function booted()
    {
        static::creating(function ($item) {
            if (empty($item->id) || str_starts_with($item->id, 'aa_')) {
                $all = static::select('id')->get();
                $nextNum = 1;
                foreach ($all as $aa) {
                    if (preg_match('/^aa(\d+)$/', $aa->id, $matches)) {
                        $num = (int)$matches[1];
                        if ($num < 100000 && $num >= $nextNum) {
                            $nextNum = $num + 1;
                        }
                    }
                }
                $item->id = "aa{$nextNum}";
            }
        });
    }
}
