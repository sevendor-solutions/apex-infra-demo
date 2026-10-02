<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SiteVisit extends Model
{
    use HasFactory;

    protected $table = 'site_visits';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'customerName',
        'customerPhone',
        'customerEmail',
        'projectAssociation',
        'projectName',
        'visitDate',
        'visitTime',
        'emailStatus',
        'emailSentDate',
        'assignedAgent',
        'assignedAgentPhone',
        'status',
        'location',
        'notes',
        'reminderSent',
        'feedback',
        'userId',
    ];

    protected $casts = [
        'reminderSent' => 'boolean',
    ];

    protected static function booted()
    {
        static::creating(function ($item) {
            if (empty($item->id) || str_starts_with($item->id, 'sv_')) {
                $all = static::select('id')->get();
                $nextNum = 1;
                foreach ($all as $sv) {
                    if (preg_match('/^sv(\d+)$/', $sv->id, $matches)) {
                        $num = (int)$matches[1];
                        if ($num < 100000 && $num >= $nextNum) {
                            $nextNum = $num + 1;
                        }
                    }
                }
                $item->id = "sv{$nextNum}";
            }
        });
    }
}
