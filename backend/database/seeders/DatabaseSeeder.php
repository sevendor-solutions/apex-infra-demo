<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use App\Models\PropertyType;
use App\Models\Facing;
use App\Models\Amenity;
use App\Models\MailConfig;
use App\Models\CompanyProfile;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Seed Property Types
        if (PropertyType::count() === 0) {
            PropertyType::insert([
                ['id' => 'pt1', 'name' => 'Plots', 'created_at' => now(), 'updated_at' => now()],
                ['id' => 'pt2', 'name' => '1 BHK', 'created_at' => now(), 'updated_at' => now()],
                ['id' => 'pt3', 'name' => '2 BHK', 'created_at' => now(), 'updated_at' => now()],
                ['id' => 'pt4', 'name' => '3 BHK', 'created_at' => now(), 'updated_at' => now()],
                ['id' => 'pt5', 'name' => '4 BHK', 'created_at' => now(), 'updated_at' => now()],
                ['id' => 'pt6', 'name' => 'Villa', 'created_at' => now(), 'updated_at' => now()],
            ]);
        }

        // 2. Seed Facings
        if (Facing::count() === 0) {
            Facing::insert([
                ['id' => 'f1', 'name' => 'North', 'created_at' => now(), 'updated_at' => now()],
                ['id' => 'f2', 'name' => 'East', 'created_at' => now(), 'updated_at' => now()],
                ['id' => 'f3', 'name' => 'West', 'created_at' => now(), 'updated_at' => now()],
                ['id' => 'f4', 'name' => 'South', 'created_at' => now(), 'updated_at' => now()],
                ['id' => 'f5', 'name' => 'North East', 'created_at' => now(), 'updated_at' => now()],
                ['id' => 'f6', 'name' => 'North West', 'created_at' => now(), 'updated_at' => now()],
            ]);
        }

        // 3. Seed Amenities
        if (Amenity::count() === 0) {
            Amenity::insert([
                ['id' => 'a1', 'name' => 'Clubhouse', 'created_at' => now(), 'updated_at' => now()],
                ['id' => 'a2', 'name' => 'Gymnasium', 'created_at' => now(), 'updated_at' => now()],
                ['id' => 'a3', 'name' => 'Swimming Pool', 'created_at' => now(), 'updated_at' => now()],
                ['id' => 'a4', 'name' => 'Gated Security', 'created_at' => now(), 'updated_at' => now()],
            ]);
        }

        // 4. Seed Default Admin User
        if (!User::where('username', 'admin')->exists()) {
            User::create([
                'id' => 'u1',
                'username' => 'admin',
                'role' => 'Admin',
                'name' => 'Apex Infra',
                'email' => 'info@apexinfra.com',
                'password' => 'admin123',
                'allowedScreens' => [
                    'dashboard', 'projects', 'marketing', 'sites', 'project_gallery', 'marketing_gallery', 
                    'blogs', 'project_enquiries', 'marketing_enquiries', 'careers', 'users', 'masters', 
                    'documents', 'marketing_agents', 'site_visits', 'mail_config', 'audit_logs', 'expenses', 
                    'wallets', 'quotations', 'inventory', 'loans', 'invoices', 'customers', 
                    'suppliers', 'payments', 'auditor_reports', 'cost_analysis', 'stage_checklist', 'company_profile'
                ],
                'isActive' => true,
            ]);
        }

        // 5. Seed MailConfig default
        if (!MailConfig::find('default')) {
            MailConfig::create([
                'id' => 'default',
                'deliveryMode' => 'simulation',
                'triggerWindowDays' => 5,
                'sendBeforeDays' => 1,
                'smtpHost' => 'smtpout.secureserver.net',
                'smtpPort' => 587,
                'smtpUser' => 'info@apexinfra.com',
                'smtpPass' => 'APEXINFRA@999',
                'senderEmail' => 'info@apexinfra.com',
                'summaryEmail' => 'info@apexinfra.com',
                'emailSubject' => 'Reminder: Scheduled Site Visit for {projectName}',
                'emailTemplate' => "Hello {customerName},\n\nThis is a friendly reminder that you have a scheduled site visit for {projectName} on {visitDate} at {visitTime}.\n\nLocation: {location}\n\nOur property consultant {assignedAgent} (Phone: {assignedAgentPhone}) will guide you.\n\nWarm regards,\nApex Infra Team",
                'dbType' => env('DB_CONNECTION', 'pgsql'),
                'dbHost' => env('DB_HOST', '127.0.0.1'),
                'dbPort' => (int)env('DB_PORT', 5432),
                'dbUser' => env('DB_USERNAME', 'postgres'),
                'dbPassword' => env('DB_PASSWORD', 'doorstep'),
                'dbName' => env('DB_DATABASE', 'JKFutureDB'),
                'jwtSecret' => env('JWT_SECRET', 'jk_future_infra_secret_jwt_key_2026'),
            ]);
        }

        // 6. Seed CompanyProfile default
        if (CompanyProfile::count() === 0) {
            CompanyProfile::create([
                'companyName' => 'Apex Real Estate & Infra',
                'tagline' => 'Building Landmarks, Fulfilling Dreams',
                'logoUrl' => '/uploads/logo.png',
                'phonePrimary' => '+91 9876543210',
                'phoneSecondary' => '+91 9876543211',
                'whatsapp' => '919876543210',
                'email' => 'info@apexinfra.com',
                'address' => 'Business Towers, Tech Park Road, Visakhapatnam, Andhra Pradesh',
                'city' => 'Visakhapatnam',
                'state' => 'Andhra Pradesh',
                'pincode' => '530001',
                'isoCertification' => 'ISO 9001:2015 Certified',
                'rera1' => 'AP RERA: P0123456789',
                'rera2' => 'TS RERA: P0987654321',
                'copyrightText' => '© 2026 Apex Real Estate & Infra. All rights reserved.',
            ]);
        }

        // 7. Seed Complete Turnkey Mock Data for Demo
        $this->call(DemoDataSeeder::class);
    }
}
