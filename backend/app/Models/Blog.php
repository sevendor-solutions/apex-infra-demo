<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Blog extends Model
{
    use HasFactory;

    protected $table = 'blogs';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'title',
        'slug',
        'summary',
        'excerpt',
        'content',
        'category',
        'author',
        'image',
        'coverImage',
        'date',
        'tags',
        'readTime',
        'published',
        'publishedAt',
        'userId',
    ];

    protected $casts = [
        'published' => 'boolean',
        'tags' => 'array',
        'publishedAt' => 'datetime',
    ];

    protected static function booted()
    {
        static::creating(function ($blog) {
            if (empty($blog->id) || str_starts_with($blog->id, 'b_')) {
                $all = static::select('id')->get();
                $nextNum = 1;
                foreach ($all as $item) {
                    if (preg_match('/^b(\d+)$/', $item->id, $matches)) {
                        $num = (int)$matches[1];
                        if ($num < 100000 && $num >= $nextNum) {
                            $nextNum = $num + 1;
                        }
                    }
                }
                $blog->id = "b{$nextNum}";
            }
        });
    }
}
