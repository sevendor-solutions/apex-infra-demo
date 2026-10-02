<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class MarketingAgent extends Model
{
    use HasFactory;

    protected $table = 'marketing_agents';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'name',
        'phone',
        'email',
        'designation',
        'photoUrl',
        'agencyName',
        'reraNumber',
        'status',
        'notes',
        'userId',
    ];

    protected static function booted()
    {
        static::creating(function ($agent) {
            if (empty($agent->id) || str_starts_with($agent->id, 'ma_') || str_starts_with($agent->id, 'a_')) {
                $all = static::select('id')->get();
                $nextNum = 1;
                foreach ($all as $item) {
                    if (preg_match('/^(?:ma|a)(\d+)$/', $item->id, $matches)) {
                        $num = (int)$matches[1];
                        if ($num < 100000 && $num >= $nextNum) {
                            $nextNum = $num + 1;
                        }
                    }
                }
                $agent->id = "ma{$nextNum}";
            }
        });
    }
}
