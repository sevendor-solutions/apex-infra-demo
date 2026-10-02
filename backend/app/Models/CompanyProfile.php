<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CompanyProfile extends Model
{
    protected $table = 'company_profiles';

    protected $fillable = [
        'companyName',
        'tagline',
        'logoUrl',
        'iconUrl',
        'phonePrimary',
        'phoneSecondary',
        'whatsapp',
        'email',
        'address',
        'city',
        'state',
        'pincode',
        'isoCertification',
        'rera1',
        'rera2',
        'gstNumber',
        'copyrightText',
        'facebookUrl',
        'instagramUrl',
        'linkedinUrl',
        'youtubeUrl',
        'twitterUrl',
        'googleMapEmbedUrl',
        'aboutSummary',
        'officeHours',
        'bankName',
        'bankAccountNumber',
        'bankIfsc',
        'bankAccountName',
        'upiId',
        'signatureUrl',
        'authorizedSignatoryName',
        'authorizedSignatoryDesignation',
    ];

    protected $appends = [
        'primaryPhone',
        'secondaryPhone',
        'registeredOffice',
        'operationalOffice',
        'isoCertified',
        'apReraNumber',
        'tsReraNumber',
        'stateName',
        'stateCode',
        'instagramProfile',
    ];

    public function getPrimaryPhoneAttribute()
    {
        return $this->phonePrimary;
    }

    public function getSecondaryPhoneAttribute()
    {
        return $this->phoneSecondary;
    }

    public function getRegisteredOfficeAttribute()
    {
        return $this->address;
    }

    public function getOperationalOfficeAttribute()
    {
        return $this->address;
    }

    public function getIsoCertifiedAttribute()
    {
        return $this->isoCertification;
    }

    public function getApReraNumberAttribute()
    {
        return $this->rera1;
    }

    public function getTsReraNumberAttribute()
    {
        return $this->rera2;
    }

    public function getStateNameAttribute()
    {
        return $this->state;
    }

    public function getStateCodeAttribute()
    {
        return '37';
    }

    public function getInstagramProfileAttribute()
    {
        return $this->instagramUrl;
    }
}
