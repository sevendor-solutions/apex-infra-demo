<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\User;
use App\Models\UserSessionLog;
use App\Models\MailConfig;
use App\Services\AuditLogger;
use Illuminate\Support\Facades\Log;

class UserController extends Controller
{
    public function getSessionLogs()
    {
        $logs = UserSessionLog::orderBy('created_at', 'desc')->limit(100)->get();
        return response()->json(['success' => true, 'data' => $logs]);
    }

    public function index()
    {
        $users = User::orderBy('name', 'asc')->get();
        $clean = $users->map(function ($u) {
            $data = $u->toArray();
            unset($data['password']);
            return $data;
        });
        return response()->json(['success' => true, 'data' => $clean]);
    }

    public function store(Request $request)
    {
        $username = strtolower(trim($request->input('username', '')));
        $email = trim($request->input('email', ''));
        $password = $request->input('password');
        $name = $request->input('name');
        $role = $request->input('role', 'Admin');

        if (!$username) {
            return response()->json(['success' => false, 'message' => 'Username is required'], 400);
        }

        $exists = User::whereRaw('LOWER(username) = ?', [$username])->exists();
        if ($exists) {
            return response()->json(['success' => false, 'message' => 'Username already exists'], 400);
        }

        $data = $request->all();
        $data['username'] = $username;
        $data['email'] = $email;

        $newUser = User::create($data);
        $userJson = $newUser->toArray();
        unset($userJson['password']);

        AuditLogger::log($request, 'User Created', "Created user profile: \"{$username}\" (Name: {$name}, Role: {$role})", 'Success');

        // Credentials notification
        if ($email) {
            try {
                $config = MailConfig::find('default');
                if ($config && $config->deliveryMode === 'simulation') {
                    Log::info("✉️ MOCK USER LOGIN EMAIL SENT (SIMULATION MODE): User {$username}, Email {$email}");
                    AuditLogger::log($request, 'Email Dispatch Simulated', "Simulated credentials email dispatch to \"{$email}\" for new user: \"{$username}\"", 'Success');
                }
            } catch (\Throwable $e) {
                Log::error('User creation email error: ' . $e->getMessage());
            }
        }

        return response()->json(['success' => true, 'data' => $userJson], 201);
    }

    public function update(Request $request, $id)
    {
        $user = User::find($id);
        if (!$user) {
            return response()->json(['success' => false, 'message' => 'User not found'], 404);
        }

        $updateData = $request->all();
        if (isset($updateData['username'])) {
            $updateData['username'] = strtolower(trim($updateData['username']));
        }
        if (isset($updateData['email'])) {
            $updateData['email'] = trim($updateData['email']);
        }
        if (empty($updateData['password'])) {
            unset($updateData['password']);
        }

        $user->update($updateData);
        $userJson = $user->toArray();
        unset($userJson['password']);

        AuditLogger::log($request, 'User Updated', "Updated user profile details for \"{$user->username}\"", 'Success');

        return response()->json(['success' => true, 'data' => $userJson]);
    }

    public function destroy(Request $request, $id)
    {
        $user = User::find($id);
        if (!$user) {
            return response()->json(['success' => false, 'message' => 'User not found'], 404);
        }

        $username = $user->username;
        $user->delete();

        AuditLogger::log($request, 'User Deleted', "Deleted user profile: \"{$username}\"", 'Success');

        return response()->json(['success' => true, 'message' => 'User deleted successfully']);
    }
}
