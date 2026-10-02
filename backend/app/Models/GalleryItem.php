<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class GalleryItem extends Model
{
    use HasFactory;

    protected $table = 'gallery_items';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'title',
        'category',
        'type',
        'url',
        'imageUrl',
        'thumbnail',
        'date',
        'projectAssociation',
        'isMarketing',
        'userId',
    ];

    protected $casts = [
        'isMarketing' => 'boolean',
    ];

    protected static function booted()
    {
        static::creating(function ($item) {
            if (empty($item->id) || str_starts_with($item->id, 'g_')) {
                $all = static::select('id')->get();
                $nextNum = 1;
                foreach ($all as $g) {
                    if (preg_match('/^g(\d+)$/', $g->id, $matches)) {
                        $num = (int)$matches[1];
                        if ($num < 100000 && $num >= $nextNum) {
                            $nextNum = $num + 1;
                        }
                    }
                }
                $item->id = "g{$nextNum}";
            }
        });
    }
}
