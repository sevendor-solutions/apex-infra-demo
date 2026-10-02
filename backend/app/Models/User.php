<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    use HasFactory, Notifiable;

    protected $table = 'users';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'username',
        'role',
        'agentId',
        'name',
        'email',
        'password',
        'allowedScreens',
        'isActive',
    ];

    protected $hidden = [
        'password',
    ];

    protected $casts = [
        'allowedScreens' => 'array',
        'isActive' => 'boolean',
    ];

    // Password mutator to match Base64 encoding used in Express
    public function setPasswordAttribute($value)
    {
        $this->attributes['password'] = base64_encode($value);
    }

    // Auto-generate sequential ID: u1, u2, u3...
    protected static function booted()
    {
        static::creating(function ($user) {
            if (empty($user->id) || str_starts_with($user->id, 'u_')) {
                $all = static::select('id')->get();
                $nextNum = 1;
                foreach ($all as $item) {
                    if (preg_match('/^u(\d+)$/', $item->id, $matches)) {
                        $num = (int)$matches[1];
                        if ($num < 100000 && $num >= $nextNum) {
                            $nextNum = $num + 1;
                        }
                    }
                }
                $user->id = "u{$nextNum}";
            }
        });
    }
}
