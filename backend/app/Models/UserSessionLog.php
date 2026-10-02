<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class UserSessionLog extends Model
{
    use HasFactory;

    protected $table = 'user_session_logs';

    protected $fillable = [
        'userId',
        'username',
        'action',
        'ipAddress',
        'userAgent',
        'device',
    ];
}
