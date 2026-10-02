<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Project extends Model
{
    use HasFactory;

    protected $table = 'projects';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'name',
        'category',
        'subCategory',
        'status',
        'location',
        'description',
        'overview',
        'price',
        'priceRange',
        'priceValue',
        'area',
        'facing',
        'propertyType',
        'amenities',
        'specifications',
        'images',
        'videos',
        'highlights',
        'brochureUrl',
        'videoUrl',
        'floorPlans',
        'timeline',
        'paymentPlans',
        'mapCoordinates',
        'reraNumber',
        'featured',
        'city',
        'microLocation',
        'floors',
        'unitsCount',
        'availabilityDetails',
        'specImage',
        'uds',
        'width',
        'length',
        'classification',
        'isActive',
        'remarks',
        'marketingResult',
        'agentId',
        'referredByName',
        'referredByPhone',
        'referredRemarks',
        'isMarketing',
        'userId',
    ];

    protected $casts = [
        'price' => 'double',
        'priceValue' => 'integer',
        'featured' => 'boolean',
        'isActive' => 'boolean',
        'isMarketing' => 'boolean',
        'amenities' => 'array',
        'specifications' => 'array',
        'images' => 'array',
        'videos' => 'array',
        'highlights' => 'array',
        'floorPlans' => 'array',
        'timeline' => 'array',
        'paymentPlans' => 'array',
        'mapCoordinates' => 'array',
    ];

    protected static function booted()
    {
        static::creating(function ($project) {
            $prefix = $project->isMarketing ? 'm' : 'p';
            $rawPrefix = $project->isMarketing ? 'm_' : 'p_';
            if (empty($project->id) || str_starts_with($project->id, $rawPrefix)) {
                $all = static::where('isMarketing', (bool)$project->isMarketing)->select('id')->get();
                $nextNum = 1;
                foreach ($all as $item) {
                    if (preg_match("/^{$prefix}(\\d+)$/", $item->id, $matches)) {
                        $num = (int)$matches[1];
                        if ($num < 100000 && $num >= $nextNum) {
                            $nextNum = $num + 1;
                        }
                    }
                }
                $project->id = "{$prefix}{$nextNum}";
            }
        });
    }
}
