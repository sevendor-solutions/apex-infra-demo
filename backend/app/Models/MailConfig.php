<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class MailConfig extends Model
{
    use HasFactory;

    protected $table = 'mail_configs';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'deliveryMode',
        'triggerWindowDays',
        'sendBeforeDays',
        'smtpHost',
        'smtpPort',
        'smtpUser',
        'smtpPass',
        'senderEmail',
        'summaryEmail',
        'emailSubject',
        'emailTemplate',
        'smsProvider',
        'smsApiKey',
        'smsSenderId',
        'smsEnabled',
        'whatsappToken',
        'whatsappPhoneId',
        'whatsappEnabled',
        'dbType',
        'dbHost',
        'dbPort',
        'dbUser',
        'dbPassword',
        'dbName',
        'jwtSecret',
        'facebookPageId',
        'facebookPageAccessToken',
        'instagramAccountId',
        'userId',
    ];

    protected $casts = [
        'triggerWindowDays' => 'integer',
        'sendBeforeDays' => 'integer',
        'smtpPort' => 'integer',
        'dbPort' => 'integer',
        'smsEnabled' => 'boolean',
        'whatsappEnabled' => 'boolean',
    ];
}
