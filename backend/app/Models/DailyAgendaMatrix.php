<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class DailyAgendaMatrix extends Model
{
    use HasFactory;

    protected $table = 'daily_agenda_matrices';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'title',
        'columns',
        'rows',
        'cellChecklists',
        'taskItems',
    ];

    protected $casts = [
        'columns' => 'array',
        'rows' => 'array',
        'cellChecklists' => 'array',
        'taskItems' => 'array',
    ];
}
