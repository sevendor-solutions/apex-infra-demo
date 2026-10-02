<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\CompanyProfile;
use App\Services\AuditLogger;
use Illuminate\Support\Facades\File;

class CompanyProfileController extends Controller
{
    private function getOrCreateDefaultProfile(): CompanyProfile
    {
        $profile = CompanyProfile::first();
        if (!$profile) {
            $profile = CompanyProfile::create([
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
        return $profile;
    }

    public function show()
    {
        $profile = $this->getOrCreateDefaultProfile();
        return response()->json(['success' => true, 'data' => $profile]);
    }

    public function update(Request $request)
    {
        $profile = $this->getOrCreateDefaultProfile();

        $data = $request->except(['id', 'created_at', 'updated_at', 'logo', 'icon', 'signature']);

        // Handle direct logo file upload
        if ($request->hasFile('logo')) {
            $file = $request->file('logo');
            $uploadDir = public_path('uploads/branding');
            if (!File::exists($uploadDir)) {
                File::makeDirectory($uploadDir, 0755, true);
            }
            $ext = $file->getClientOriginalExtension() ?: 'png';
            $filename = 'company_logo_' . time() . '.' . $ext;
            $file->move($uploadDir, $filename);
            $data['logoUrl'] = '/uploads/branding/' . $filename;
        }

        // Handle direct icon file upload
        if ($request->hasFile('icon')) {
            $file = $request->file('icon');
            $uploadDir = public_path('uploads/branding');
            if (!File::exists($uploadDir)) {
                File::makeDirectory($uploadDir, 0755, true);
            }
            $ext = $file->getClientOriginalExtension() ?: 'png';
            $filename = 'company_icon_' . time() . '.' . $ext;
            $file->move($uploadDir, $filename);
            $data['iconUrl'] = '/uploads/branding/' . $filename;
        }

        // Handle direct signature file upload
        if ($request->hasFile('signature')) {
            $file = $request->file('signature');
            $uploadDir = public_path('uploads/branding');
            if (!File::exists($uploadDir)) {
                File::makeDirectory($uploadDir, 0755, true);
            }
            $ext = $file->getClientOriginalExtension() ?: 'png';
            $filename = 'company_signature_' . time() . '.' . $ext;
            $file->move($uploadDir, $filename);
            $data['signatureUrl'] = '/uploads/branding/' . $filename;
        }

        $profile->update($data);

        // Keep primary admin user name and email synchronized with company branding (credentials unchanged)
        $adminUser = \App\Models\User::where('role', 'Admin')->first();
        if ($adminUser) {
            $updatedUser = false;
            if (!empty($data['companyName']) && $adminUser->name !== $data['companyName']) {
                $adminUser->name = $data['companyName'];
                $updatedUser = true;
            }
            if (!empty($data['email']) && $adminUser->email !== $data['email']) {
                $adminUser->email = $data['email'];
                $updatedUser = true;
            }
            if ($updatedUser) {
                $adminUser->save();
            }
        }

        AuditLogger::log(
            $request,
            'Update Company Profile',
            "Updated company details & branding for: \"{$profile->companyName}\"",
            'Success'
        );

        return response()->json([
            'success' => true,
            'data' => $profile,
            'message' => 'Company profile updated successfully'
        ]);
    }

    public function uploadLogo(Request $request)
    {
        if (!$request->hasFile('logo') && !$request->hasFile('image')) {
            return response()->json(['success' => false, 'message' => 'No image file uploaded'], 400);
        }

        $file = $request->file('logo') ?: $request->file('image');
        $uploadDir = public_path('uploads/branding');
        if (!File::exists($uploadDir)) {
            File::makeDirectory($uploadDir, 0755, true);
        }

        $ext = $file->getClientOriginalExtension() ?: 'png';
        $filename = 'brand_logo_' . time() . '.' . $ext;
        $file->move($uploadDir, $filename);

        $url = '/uploads/branding/' . $filename;

        AuditLogger::log(
            $request,
            'Logo Upload',
            "Uploaded company logo: {$filename}",
            'Success'
        );

        return response()->json([
            'success' => true,
            'url' => $url,
            'message' => 'Logo uploaded successfully'
        ]);
    }
}
