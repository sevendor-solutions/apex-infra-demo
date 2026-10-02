<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class LocationMaster extends Model
{
    use HasFactory;

    protected $table = 'location_masters';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'name',
        'cityId',
        'userId',
    ];

    public function city()
    {
        return $this->belongsTo(City::class, 'cityId');
    }

    protected static function booted()
    {
        static::creating(function ($loc) {
            if (empty($loc->id) || str_starts_with($loc->id, 'loc_')) {
                $all = static::select('id')->get();
                $nextNum = 1;
                foreach ($all as $l) {
                    if (preg_match('/^loc(\d+)$/', $l->id, $matches)) {
                        $num = (int)$matches[1];
                        if ($num < 100000 && $num >= $nextNum) {
                            $nextNum = $num + 1;
                        }
                    }
                }
                $loc->id = "loc{$nextNum}";
            }
        });
    }
}
