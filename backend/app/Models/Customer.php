<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Customer extends Model
{
    use HasFactory;

    protected $table = 'customers';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'name',
        'mobile',
        'email',
        'address',
        'gstNumber',
        'creditLimit',
        'openingBalance',
        'outstandingAmount',
        'userId',
    ];

    protected $casts = [
        'creditLimit' => 'double',
        'openingBalance' => 'double',
        'outstandingAmount' => 'double',
    ];

    protected static function booted()
    {
        static::creating(function ($item) {
            if (empty($item->id) || str_starts_with($item->id, 'c_')) {
                $all = static::select('id')->get();
                $nextNum = 1;
                foreach ($all as $c) {
                    if (preg_match('/^c(\d+)$/', $c->id, $matches)) {
                        $num = (int)$matches[1];
                        if ($num < 100000 && $num >= $nextNum) {
                            $nextNum = $num + 1;
                        }
                    }
                }
                $item->id = "c{$nextNum}";
            }
        });
    }
}
