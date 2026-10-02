<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Supplier extends Model
{
    use HasFactory;

    protected $table = 'suppliers';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'name',
        'contactNumber',
        'address',
        'gstNumber',
        'openingBalance',
        'outstandingAmount',
        'userId',
    ];

    protected $casts = [
        'openingBalance' => 'double',
        'outstandingAmount' => 'double',
    ];

    protected static function booted()
    {
        static::creating(function ($item) {
            if (empty($item->id) || str_starts_with($item->id, 's_')) {
                $all = static::select('id')->get();
                $nextNum = 1;
                foreach ($all as $s) {
                    if (preg_match('/^s(\d+)$/', $s->id, $matches)) {
                        $num = (int)$matches[1];
                        if ($num < 100000 && $num >= $nextNum) {
                            $nextNum = $num + 1;
                        }
                    }
                }
                $item->id = "s{$nextNum}";
            }
        });
    }
}
