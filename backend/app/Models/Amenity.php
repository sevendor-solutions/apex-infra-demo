<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Amenity extends Model
{
    use HasFactory;

    protected $table = 'amenities';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'name',
        'userId',
    ];

    protected static function booted()
    {
        static::creating(function ($item) {
            if (empty($item->id) || str_starts_with($item->id, 'a_')) {
                $all = static::select('id')->get();
                $nextNum = 1;
                foreach ($all as $a) {
                    if (preg_match('/^a(\d+)$/', $a->id, $matches)) {
                        $num = (int)$matches[1];
                        if ($num < 100000 && $num >= $nextNum) {
                            $nextNum = $num + 1;
                        }
                    }
                }
                $item->id = "a{$nextNum}";
            }
        });
    }
}
