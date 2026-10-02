<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Enquiry extends Model
{
    use HasFactory;

    protected $table = 'enquiries';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'name',
        'email',
        'phone',
        'project',
        'projectName',
        'projectAssociation',
        'propertyType',
        'message',
        'status',
        'date',
        'notes',
        'isMarketing',
        'agentId',
        'userId',
    ];

    protected $casts = [
        'isMarketing' => 'boolean',
    ];

    protected static function booted()
    {
        static::creating(function ($enquiry) {
            if (empty($enquiry->id) || str_starts_with($enquiry->id, 'e_')) {
                $all = static::select('id')->get();
                $nextNum = 1;
                foreach ($all as $e) {
                    if (preg_match('/^e(\d+)$/', $e->id, $matches)) {
                        $num = (int)$matches[1];
                        if ($num < 100000 && $num >= $nextNum) {
                            $nextNum = $num + 1;
                        }
                    }
                }
                $enquiry->id = "e{$nextNum}";
            }
        });
    }
}
