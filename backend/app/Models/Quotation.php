<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Quotation extends Model
{
    use HasFactory;

    protected $table = 'quotations';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'quotationNumber',
        'customerName',
        'customerMobile',
        'customerAddress',
        'date',
        'validTillDate',
        'items',
        'amenityItems',
        'totalAmount',
        'notes',
        'termsAndConditions',
        'status',
        'projectName',
        'convertedInvoiceId',
        'convertedInvoiceNumber',
        'userId',
    ];

    protected $casts = [
        'items' => 'array',
        'amenityItems' => 'array',
        'totalAmount' => 'double',
    ];

    protected static function booted()
    {
        static::creating(function ($item) {
            if (empty($item->id) || str_starts_with($item->id, 'q_')) {
                $all = static::select('id')->get();
                $nextNum = 1;
                foreach ($all as $q) {
                    if (preg_match('/^q(\d+)$/', $q->id, $matches)) {
                        $num = (int)$matches[1];
                        if ($num < 100000 && $num >= $nextNum) {
                            $nextNum = $num + 1;
                        }
                    }
                }
                $item->id = "q{$nextNum}";
            }
        });
    }
}
