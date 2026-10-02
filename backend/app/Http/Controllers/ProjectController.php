<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Project;
use App\Models\MarketingAgent;
use App\Services\AuditLogger;
use App\Services\FacebookService;

class ProjectController extends Controller
{
    private function formatPriceRangeDisplay(?string $rawPrice): string
    {
        if (!$rawPrice) return 'Contact for Price';
        $formatted = trim($rawPrice);
        $formatted = preg_replace('/(\d+)\s*L(?!akh)/i', '$1 Lakhs', $formatted);
        $formatted = preg_replace('/(\d+)\s*Cr(?!ore)/i', '$1 Crore', $formatted);
        $formatted = preg_replace('/1\s*Crores/i', '1 Crore', $formatted);
        return $formatted;
    }

    private function buildSocialPostMessage($project): string
    {
        $locParts = array_filter([$project->location, $project->microLocation, $project->city]);
        $locationStr = implode(", ", $locParts);
        $cityHash = $project->city ? '#' . str_replace(' ', '', $project->city) : '';
        $microHash = $project->microLocation ? '#' . str_replace(' ', '', $project->microLocation) : '';
        $categoryHash = $project->category ? '#' . str_replace(' ', '', $project->category) : '';
        $hashtagsList = trim(preg_replace('/\s+/', ' ', "#RealEstate #VisakhapatnamProperty #JKFutureInfra #Trending #Investment {$cityHash} {$microHash} {$categoryHash} #PlotsForSale #DreamHome"));

        $baseUrl = "https://jkfutureinfra.com";
        $propertyDetailUrl = $project->id 
            ? "{$baseUrl}/project-details?id={$project->id}" . ($project->isMarketing ? '&isMarketing=true' : '')
            : $baseUrl;

        $phoneNum = "9000553832";
        $agentName = "";
        if ($project->isMarketing && $project->agentId) {
            $agent = MarketingAgent::find($project->agentId);
            if ($agent && $agent->phone) {
                $phoneNum = preg_replace('/\D/', '', $agent->phone);
                $agentName = $agent->name;
            }
        }
        if (!$phoneNum || strlen($phoneNum) < 10) {
            $phoneNum = "9000553832";
        }

        $cleanDigits = substr($phoneNum, -10);
        $waLink = "https://wa.me/91{$cleanDigits}?text=" . urlencode("Hi, I want property details");
        $formattedPrice = $this->formatPriceRangeDisplay($project->priceRange);

        if ($project->isMarketing) {
            $agentNameStr = $agentName ? "👤 Marketing Agent: {$agentName}\n" : '';
            return "✨ FEATURED PROPERTY SHOWCASE ✨\n\n🏢 Property: {$project->name}\n🏷️ Segment: " . ($project->category ?: 'Real Estate') . "\n📍 Location: {$locationStr}\n💰 Investment: {$formattedPrice}\n\n📝 Description:\n" . ($project->description ?: '') . "\n\n🔥 READY FOR IMMEDIATE REGISTRATION & SITE VISITS 🔥\n\n👉 🚗 Book a Free Site Visit Today!\n🌐 View Property Details: {$propertyDetailUrl}\n📲 WhatsApp Inquiry: {$waLink}\n{$agentNameStr}📞 Call / WhatsApp Agent: +91 {$cleanDigits}\n\n{$hashtagsList}";
        } else {
            return "✨ PREMIUM REAL ESTATE OPPORTUNITY ✨\n\n🏢 Venture: {$project->name}\n🏷️ Category: " . ($project->category ?: 'Real Estate') . "\n📍 Location: {$locationStr}\n💰 Price Range: {$formattedPrice}\n\n📝 Overview:\n" . ($project->description ?: '') . "\n\n🔥 READY FOR IMMEDIATE REGISTRATION & SITE VISITS 🔥\n\n👉 🚗 Book a Free Site Visit Today!\n🌐 View Property Details: {$propertyDetailUrl}\n📲 WhatsApp Inquiry: {$waLink}\n📞 Call / WhatsApp: +91 {$cleanDigits}\n\n{$hashtagsList}";
        }
    }

    public function index(Request $request)
    {
        $query = Project::query();

        if ($request->has('isMarketing')) {
            $query->where('isMarketing', filter_var($request->query('isMarketing'), FILTER_VALIDATE_BOOLEAN));
        }
        if ($request->query('category')) {
            $query->where('category', $request->query('category'));
        }
        if ($request->query('status')) {
            $query->where('status', $request->query('status'));
        }

        $projects = $query->orderBy('createdAt', 'desc')->get();
        return response()->json(['success' => true, 'data' => $projects]);
    }

    public function show($id)
    {
        $project = Project::find($id);
        if (!$project) {
            return response()->json(['success' => false, 'message' => 'Project not found'], 404);
        }
        return response()->json(['success' => true, 'data' => $project]);
    }

    public function store(Request $request)
    {
        $authUser = $request->attributes->get('auth_user');
        $data = $request->all();
        $data['userId'] = $authUser['id'] ?? null;

        $project = Project::create($data);

        // Optional social post publishing
        if ($request->input('autoPostSocial') || $request->input('publishToFacebook') || $request->input('publishToInstagram')) {
            $message = $this->buildSocialPostMessage($project);
            $imageUrl = is_array($project->images) && count($project->images) > 0 ? $project->images[0] : null;

            FacebookService::publishToFacebook($message, $imageUrl);
            if ($imageUrl) {
                FacebookService::publishToInstagram($message, $imageUrl);
            }
        }

        $typeLabel = $project->isMarketing ? 'Marketing Property' : 'Project';
        AuditLogger::log($request, "Create {$typeLabel}", "Created {$typeLabel}: {$project->name}", 'Success', ['projectId' => $project->id]);

        return response()->json(['success' => true, 'data' => $project], 201);
    }

    public function update(Request $request, $id)
    {
        $project = Project::find($id);
        if (!$project) {
            return response()->json(['success' => false, 'message' => 'Project not found'], 404);
        }

        $project->update($request->all());

        if ($request->input('autoPostSocial') || $request->input('publishToFacebook') || $request->input('publishToInstagram')) {
            $message = $this->buildSocialPostMessage($project);
            $imageUrl = is_array($project->images) && count($project->images) > 0 ? $project->images[0] : null;

            FacebookService::publishToFacebook($message, $imageUrl);
            if ($imageUrl) {
                FacebookService::publishToInstagram($message, $imageUrl);
            }
        }

        $typeLabel = $project->isMarketing ? 'Marketing Property' : 'Project';
        AuditLogger::log($request, "Update {$typeLabel}", "Updated details for: {$project->name}", 'Success', ['projectId' => $project->id]);

        return response()->json(['success' => true, 'data' => $project]);
    }

    public function destroy(Request $request, $id)
    {
        $project = Project::find($id);
        if (!$project) {
            return response()->json(['success' => false, 'message' => 'Project not found'], 404);
        }

        $name = $project->name;
        $typeLabel = $project->isMarketing ? 'Marketing Property' : 'Project';
        $project->delete();

        AuditLogger::log($request, "Delete {$typeLabel}", "Deleted {$typeLabel}: {$name}", 'Success');

        return response()->json(['success' => true, 'message' => 'Project deleted successfully']);
    }
}
