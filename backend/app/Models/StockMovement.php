<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class StockMovement extends Model
{
    use HasFactory;

    protected $table = 'stock_movements';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'productCode',
        'type',
        'quantity',
        'date',
        'warehouse',
        'notes',
        'userId',
    ];

    protected $casts = [
        'quantity' => 'double',
    ];

    protected static function booted()
    {
        static::creating(function ($item) {
            if (empty($item->id) || str_starts_with($item->id, 'sm_')) {
                $all = static::select('id')->get();
                $nextNum = 1;
                foreach ($all as $sm) {
                    if (preg_match('/^sm(\d+)$/', $sm->id, $matches)) {
                        $num = (int)$matches[1];
                        if ($num < 100000 && $num >= $nextNum) {
                            $nextNum = $num + 1;
                        }
                    }
                }
                $item->id = "sm{$nextNum}";
            }
        });
    }
}
