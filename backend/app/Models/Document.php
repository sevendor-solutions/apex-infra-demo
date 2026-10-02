<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Document extends Model
{
    use HasFactory;

    protected $table = 'documents';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'title',
        'category',
        'fileUrl',
        'fileSize',
        'fileType',
        'projectAssociation',
        'uploadedBy',
        'date',
        'sortOrder',
        'userId',
    ];

    protected $casts = [
        'sortOrder' => 'integer',
    ];

    protected static function booted()
    {
        static::creating(function ($item) {
            if (empty($item->id) || str_starts_with($item->id, 'd_')) {
                $all = static::select('id')->get();
                $nextNum = 1;
                foreach ($all as $d) {
                    if (preg_match('/^d(\d+)$/', $d->id, $matches)) {
                        $num = (int)$matches[1];
                        if ($num < 100000 && $num >= $nextNum) {
                            $nextNum = $num + 1;
                        }
                    }
                }
                $item->id = "d{$nextNum}";
            }
        });
    }
}
