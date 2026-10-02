<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CostAnalysis extends Model
{
    use HasFactory;

    protected $table = 'cost_analyses';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'projectId',
        'projectName',
        'location',
        'date',
        'siteAreaSqYards',
        'outRateCostPerSqYard',
        'outRateCostTotal',
        'govtMarketValuePerSqYard',
        'registrationPercentage',
        'registrationCost',
        'lrsVudaPercentage',
        'lrsVudaCost',
        'totalLandCost',
        'gvmcPlanApprovalCost',
        'tdrPercentage',
        'tdrAreaSft',
        'tdrTotalCost',
        'totalTdrPlanCost',
        'totalFlatsAreaSft',
        'constructionCostPerSft',
        'totalConstructionCost',
        'ownerSharePercent',
        'builderSharePercent',
        'totalProjectCost',
        'totalSaluableAreaSft',
        'sellingPricePerSft',
        'totalAreaSaluableCost',
        'amenitiesCostPerUnit',
        'numberOfUnits',
        'totalAmenitiesCost',
        'totalSaleValue',
        'costPerOneSft',
        'netMarginTotal',
        'landPurchaseCost',
        'apcpdclElectricityCost',
        'constructionCivilCost',
        'borewellsCost',
        'liftCost',
        'transformerCost',
        'waterSumpCost',
        'generatorCost',
        'intercomCost',
        'cctvCost',
        'solarCost',
        'fireSafetyCost',
        'architectCost',
        'supervisionCost',
        'securityCost',
        'marketingExpense',
        'legalRegistrationCost',
        'contingencyCost',
        'customExpenses',
        'totalOutflow',
        'flatSalesEstimate',
        'commercialSalesEstimate',
        'customInflows',
        'totalInflow',
        'netProfit',
        'profitMarginPercent',
        'notes',
    ];

    protected $casts = [
        'siteAreaSqYards' => 'double',
        'gvmcPlanApprovalCost' => 'double',
        'landPurchaseCost' => 'double',
        'apcpdclElectricityCost' => 'double',
        'constructionCivilCost' => 'double',
        'borewellsCost' => 'double',
        'liftCost' => 'double',
        'transformerCost' => 'double',
        'waterSumpCost' => 'double',
        'generatorCost' => 'double',
        'intercomCost' => 'double',
        'cctvCost' => 'double',
        'solarCost' => 'double',
        'fireSafetyCost' => 'double',
        'architectCost' => 'double',
        'supervisionCost' => 'double',
        'securityCost' => 'double',
        'marketingExpense' => 'double',
        'legalRegistrationCost' => 'double',
        'contingencyCost' => 'double',
        'totalOutflow' => 'double',
        'flatSalesEstimate' => 'double',
        'commercialSalesEstimate' => 'double',
        'totalInflow' => 'double',
        'netProfit' => 'double',
        'profitMarginPercent' => 'double',
        'customExpenses' => 'array',
        'customInflows' => 'array',
    ];

    protected static function booted()
    {
        static::creating(function ($item) {
            if (empty($item->id)) {
                $item->id = 'cost_' . round(microtime(true) * 1000) . '_' . substr(bin2hex(random_bytes(3)), 0, 4);
            }
        });
    }
}
