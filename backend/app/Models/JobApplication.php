<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class JobApplication extends Model
{
    use HasFactory;

    protected $table = 'job_applications';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'position',
        'name',
        'applicantName',
        'email',
        'phone',
        'experience',
        'resumeUrl',
        'coverLetter',
        'status',
        'date',
        'notes',
        'userId',
    ];

    protected static function booted()
    {
        static::creating(function ($item) {
            if (empty($item->id) || str_starts_with($item->id, 'ja_')) {
                $all = static::select('id')->get();
                $nextNum = 1;
                foreach ($all as $ja) {
                    if (preg_match('/^ja(\d+)$/', $ja->id, $matches)) {
                        $num = (int)$matches[1];
                        if ($num < 100000 && $num >= $nextNum) {
                            $nextNum = $num + 1;
                        }
                    }
                }
                $item->id = "ja{$nextNum}";
            }
        });
    }
}
