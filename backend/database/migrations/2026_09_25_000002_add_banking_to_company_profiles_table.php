<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('company_profiles', function (Blueprint $table) {
            $table->string('bankName')->nullable()->default('State Bank of India');
            $table->string('bankAccountNumber')->nullable()->default('45116449587');
            $table->string('bankIfsc')->nullable()->default('SBIN0006832');
            $table->string('bankAccountName')->nullable();
            $table->string('upiId')->nullable()->default('payments@upi');
        });
    }

    public function down(): void
    {
        Schema::table('company_profiles', function (Blueprint $table) {
            $table->dropColumn(['bankName', 'bankAccountNumber', 'bankIfsc', 'bankAccountName', 'upiId']);
        });
    }
};
