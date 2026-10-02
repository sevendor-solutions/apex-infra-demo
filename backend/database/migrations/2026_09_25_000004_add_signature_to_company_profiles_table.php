<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('company_profiles', function (Blueprint $table) {
            $table->string('signatureUrl')->nullable();
            $table->string('authorizedSignatoryName')->nullable()->default('Authorized Signatory');
            $table->string('authorizedSignatoryDesignation')->nullable()->default('Managing Director');
        });
    }

    public function down(): void
    {
        Schema::table('company_profiles', function (Blueprint $table) {
            $table->dropColumn(['signatureUrl', 'authorizedSignatoryName', 'authorizedSignatoryDesignation']);
        });
    }
};
