<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('company_profiles', function (Blueprint $table) {
            $table->id();
            $table->string('companyName')->default('JK Future Infra');
            $table->string('tagline')->nullable()->default('Trust us to build your dream');
            $table->string('logoUrl')->nullable()->default('/uploads/logo.png');
            $table->string('iconUrl')->nullable();
            $table->string('phonePrimary')->nullable()->default('9000553832');
            $table->string('phoneSecondary')->nullable()->default('7893963322');
            $table->string('whatsapp')->nullable()->default('9000553832');
            $table->string('email')->nullable()->default('jkfutureinfra@gmail.com');
            $table->text('address')->nullable()->default('Visakhapatnam, Andhra Pradesh, India');
            $table->string('city')->nullable()->default('Visakhapatnam');
            $table->string('state')->nullable()->default('Andhra Pradesh');
            $table->string('pincode')->nullable()->default('530001');
            $table->string('isoCertification')->nullable()->default('ISO 9001:2015 Certified Company');
            $table->string('rera1')->nullable()->default('AP RERA: A150500123');
            $table->string('rera2')->nullable()->default('TS RERA: A025000456');
            $table->string('gstNumber')->nullable();
            $table->string('copyrightText')->nullable()->default('© 2026 JK Future Infra. All rights reserved.');
            $table->string('facebookUrl')->nullable();
            $table->string('instagramUrl')->nullable();
            $table->string('linkedinUrl')->nullable();
            $table->string('youtubeUrl')->nullable();
            $table->string('twitterUrl')->nullable();
            $table->text('googleMapEmbedUrl')->nullable();
            $table->text('aboutSummary')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('company_profiles');
    }
};
