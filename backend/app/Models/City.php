<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class City extends Model
{
    use HasFactory;

    protected $table = 'cities';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'name',
        'state',
        'userId',
    ];

    public function locations()
    {
        return $this->hasMany(LocationMaster::class, 'cityId');
    }

    protected static function booted()
    {
        static::creating(function ($city) {
            if (empty($city->id) || str_starts_with($city->id, 'c_')) {
                $all = static::select('id')->get();
                $nextNum = 1;
                foreach ($all as $c) {
                    if (preg_match('/^c(\d+)$/', $c->id, $matches)) {
                        $num = (int)$matches[1];
                        if ($num < 100000 && $num >= $nextNum) {
                            $nextNum = $num + 1;
                        }
                    }
                }
                $city->id = "c{$nextNum}";
            }
        });
    }
}
