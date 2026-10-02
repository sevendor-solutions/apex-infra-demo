<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ProjectInspection extends Model
{
    use HasFactory;

    protected $table = 'project_inspections';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'projectId',
        'projectName',
        'builderName',
        'location',
        'reraNo',
        'checkedBy',
        'inspectionDate',
        'stages',
        'overallProgress',
    ];

    protected $casts = [
        'stages' => 'array',
        'overallProgress' => 'double',
    ];
}
