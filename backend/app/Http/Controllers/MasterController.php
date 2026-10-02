<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\City;
use App\Models\LocationMaster;
use App\Models\PropertyType;
use App\Models\Facing;
use App\Models\Amenity;
use App\Services\AuditLogger;

class MasterController extends Controller
{
    // --- Cities ---
    public function getCities()
    {
        $cities = City::orderBy('createdAt', 'desc')->get();
        return response()->json(['success' => true, 'data' => $cities]);
    }

    public function storeCity(Request $request)
    {
        $name = trim($request->input('name', ''));
        if (!$name) {
            return response()->json(['success' => false, 'message' => 'City name is required'], 400);
        }

        $exists = City::whereRaw('LOWER(name) = ?', [strtolower($name)])->exists();
        if ($exists) {
            return response()->json(['success' => false, 'message' => "City \"{$name}\" already exists"], 400);
        }

        $authUser = $request->attributes->get('auth_user');
        $data = $request->all();
        $data['name'] = $name;
        $data['userId'] = $authUser['id'] ?? null;

        $city = City::create($data);
        AuditLogger::log($request, 'Create City Master', "Created city master: {$city->name}", 'Success');
        return response()->json(['success' => true, 'data' => $city], 201);
    }

    public function destroyCity($id)
    {
        $city = City::find($id);
        if (!$city) {
            return response()->json(['success' => false, 'message' => 'City not found'], 404);
        }
        $name = $city->name;
        $city->delete();
        AuditLogger::log(request(), 'Delete City Master', "Deleted city master: {$name}", 'Success');
        return response()->json(['success' => true, 'message' => 'City deleted successfully']);
    }

    // --- Locations ---
    public function getLocations(Request $request)
    {
        $query = LocationMaster::with('city');
        if ($request->query('cityId')) {
            $query->where('cityId', $request->query('cityId'));
        }
        $locations = $query->orderBy('createdAt', 'desc')->get();
        return response()->json(['success' => true, 'data' => $locations]);
    }

    public function storeLocation(Request $request)
    {
        $name = trim($request->input('name', ''));
        $cityId = $request->input('cityId');

        if (!$name || !$cityId) {
            return response()->json(['success' => false, 'message' => 'Location name and City ID are required'], 400);
        }

        $exists = LocationMaster::whereRaw('LOWER(name) = ?', [strtolower($name)])
            ->where('cityId', $cityId)
            ->exists();

        if ($exists) {
            return response()->json(['success' => false, 'message' => "Location \"{$name}\" already exists in this city"], 400);
        }

        $authUser = $request->attributes->get('auth_user');
        $data = $request->all();
        $data['name'] = $name;
        $data['userId'] = $authUser['id'] ?? null;

        $location = LocationMaster::create($data);
        AuditLogger::log($request, 'Create Location Master', "Created location master: {$location->name}", 'Success');
        return response()->json(['success' => true, 'data' => $location], 201);
    }

    public function destroyLocation($id)
    {
        $location = LocationMaster::find($id);
        if (!$location) {
            return response()->json(['success' => false, 'message' => 'Location not found'], 404);
        }
        $name = $location->name;
        $location->delete();
        AuditLogger::log(request(), 'Delete Location Master', "Deleted location master: {$name}", 'Success');
        return response()->json(['success' => true, 'message' => 'Location deleted successfully']);
    }

    // --- Property Types ---
    public function getPropertyTypes()
    {
        $types = PropertyType::orderBy('createdAt', 'desc')->get();
        return response()->json(['success' => true, 'data' => $types]);
    }

    public function storePropertyType(Request $request)
    {
        $name = trim($request->input('name', ''));
        if (!$name) {
            return response()->json(['success' => false, 'message' => 'Property Type name is required'], 400);
        }

        $exists = PropertyType::whereRaw('LOWER(name) = ?', [strtolower($name)])->exists();
        if ($exists) {
            return response()->json(['success' => false, 'message' => "Property Type \"{$name}\" already exists"], 400);
        }

        $authUser = $request->attributes->get('auth_user');
        $data = $request->all();
        $data['name'] = $name;
        $data['userId'] = $authUser['id'] ?? null;

        $type = PropertyType::create($data);
        AuditLogger::log($request, 'Create Property Type Master', "Created property type master: {$type->name}", 'Success');
        return response()->json(['success' => true, 'data' => $type], 201);
    }

    public function destroyPropertyType($id)
    {
        $type = PropertyType::find($id);
        if (!$type) {
            return response()->json(['success' => false, 'message' => 'Property Type not found'], 404);
        }
        $name = $type->name;
        $type->delete();
        AuditLogger::log(request(), 'Delete Property Type Master', "Deleted property type master: {$name}", 'Success');
        return response()->json(['success' => true, 'message' => 'Property Type deleted successfully']);
    }

    // --- Facings ---
    public function getFacings()
    {
        $facings = Facing::orderBy('createdAt', 'desc')->get();
        return response()->json(['success' => true, 'data' => $facings]);
    }

    public function storeFacing(Request $request)
    {
        $name = trim($request->input('name', ''));
        if (!$name) {
            return response()->json(['success' => false, 'message' => 'Facing direction name is required'], 400);
        }

        $exists = Facing::whereRaw('LOWER(name) = ?', [strtolower($name)])->exists();
        if ($exists) {
            return response()->json(['success' => false, 'message' => "Facing direction \"{$name}\" already exists"], 400);
        }

        $authUser = $request->attributes->get('auth_user');
        $data = $request->all();
        $data['name'] = $name;
        $data['userId'] = $authUser['id'] ?? null;

        $facing = Facing::create($data);
        AuditLogger::log($request, 'Create Facing Master', "Created facing direction master: {$facing->name}", 'Success');
        return response()->json(['success' => true, 'data' => $facing], 201);
    }

    public function destroyFacing($id)
    {
        $facing = Facing::find($id);
        if (!$facing) {
            return response()->json(['success' => false, 'message' => 'Facing not found'], 404);
        }
        $name = $facing->name;
        $facing->delete();
        AuditLogger::log(request(), 'Delete Facing Master', "Deleted facing direction master: {$name}", 'Success');
        return response()->json(['success' => true, 'message' => 'Facing deleted successfully']);
    }

    // --- Amenities ---
    public function getAmenities()
    {
        $amenities = Amenity::orderBy('createdAt', 'desc')->get();
        return response()->json(['success' => true, 'data' => $amenities]);
    }

    public function storeAmenity(Request $request)
    {
        $name = trim($request->input('name', ''));
        if (!$name) {
            return response()->json(['success' => false, 'message' => 'Amenity name is required'], 400);
        }

        $exists = Amenity::whereRaw('LOWER(name) = ?', [strtolower($name)])->exists();
        if ($exists) {
            return response()->json(['success' => false, 'message' => "Amenity \"{$name}\" already exists"], 400);
        }

        $authUser = $request->attributes->get('auth_user');
        $data = $request->all();
        $data['name'] = $name;
        $data['userId'] = $authUser['id'] ?? null;

        $amenity = Amenity::create($data);
        AuditLogger::log($request, 'Create Amenity Master', "Created amenity master: {$amenity->name}", 'Success');
        return response()->json(['success' => true, 'data' => $amenity], 201);
    }

    public function destroyAmenity($id)
    {
        $amenity = Amenity::find($id);
        if (!$amenity) {
            return response()->json(['success' => false, 'message' => 'Amenity not found'], 404);
        }
        $name = $amenity->name;
        $amenity->delete();
        AuditLogger::log(request(), 'Delete Amenity Master', "Deleted amenity master: {$name}", 'Success');
        return response()->json(['success' => true, 'message' => 'Amenity deleted successfully']);
    }
}
