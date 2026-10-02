<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class InventoryItem extends Model
{
    use HasFactory;

    protected $table = 'inventory_items';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'name',
        'code',
        'category',
        'brand',
        'unit',
        'openingStock',
        'purchasePrice',
        'sellingPrice',
        'gstPercentage',
        'currentStock',
        'minimumStockLevel',
        'supplierName',
        'warehouseLocation',
        'type',
        'hsn',
        'image',
        'batchTracking',
        'sellingPriceTaxType',
        'purchasePriceTaxType',
        'batches',
        'userId',
    ];

    protected $casts = [
        'openingStock' => 'double',
        'purchasePrice' => 'double',
        'sellingPrice' => 'double',
        'gstPercentage' => 'double',
        'currentStock' => 'double',
        'minimumStockLevel' => 'double',
        'batchTracking' => 'boolean',
        'batches' => 'array',
    ];

    protected static function booted()
    {
        static::creating(function ($item) {
            if (empty($item->id) || str_starts_with($item->id, 'inv_')) {
                $all = static::select('id')->get();
                $nextNum = 1;
                foreach ($all as $inv) {
                    if (preg_match('/^inv(\d+)$/', $inv->id, $matches)) {
                        $num = (int)$matches[1];
                        if ($num < 100000 && $num >= $nextNum) {
                            $nextNum = $num + 1;
                        }
                    }
                }
                $item->id = "inv{$nextNum}";
            }
        });
    }
}
