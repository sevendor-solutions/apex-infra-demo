<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Invoice extends Model
{
    use HasFactory;

    protected $table = 'invoices';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'invoiceNumber',
        'customerName',
        'customerMobile',
        'customerAddress',
        'projectName',
        'date',
        'items',
        'amenityItems',
        'totalAmount',
        'gstAmount',
        'discountAmount',
        'paidAmount',
        'pendingAmount',
        'paymentStatus',
        'termsAndConditions',
        'notes',
        'quotationId',
        'quotationNumber',
        'userId',
    ];

    protected $casts = [
        'items' => 'array',
        'amenityItems' => 'array',
        'totalAmount' => 'double',
        'gstAmount' => 'double',
        'discountAmount' => 'double',
        'paidAmount' => 'double',
        'pendingAmount' => 'double',
    ];

    protected static function booted()
    {
        static::creating(function ($item) {
            if (empty($item->id) || str_starts_with($item->id, 'i_')) {
                $all = static::select('id')->get();
                $nextNum = 1;
                foreach ($all as $inv) {
                    if (preg_match('/^i(\d+)$/', $inv->id, $matches)) {
                        $num = (int)$matches[1];
                        if ($num < 100000 && $num >= $nextNum) {
                            $nextNum = $num + 1;
                        }
                    }
                }
                $item->id = "i{$nextNum}";
            }
        });
    }
}
