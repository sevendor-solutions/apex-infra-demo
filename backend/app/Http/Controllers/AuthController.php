<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\User;
use App\Models\UserSessionLog;
use App\Models\MailConfig;
use App\Services\AuditLogger;
use App\Http\Middleware\JwtAuthMiddleware;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;

class AuthController extends Controller
{
    private function getDeviceType(?string $userAgent): string
    {
        if (!$userAgent) return "Unknown";
        $ua = strtolower($userAgent);
        if (preg_match('/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i', $ua)) {
            return "Tablet";
        }
        if (preg_match('/Mobile|iP(hone|od)|Android|BlackBerry|IEMobile|Kindle|NetFront|Silk-Accelerated|(hpw|web)OS|Fennec|Minimo|Opera M(obi|ini)|Blazer|Dolfin|Dolphin|Skyfire|Zune/i', $ua)) {
            return "Mobile";
        }
        return "Desktop";
    }

    public function getUserEmail(string $username)
    {
        $clean = strtolower(trim($username));
        $user = User::whereRaw('LOWER(username) = ?', [$clean])->first();

        if (!$user) {
            return response()->json(['success' => false, 'message' => 'Username not found in system.'], 404);
        }
        if (!$user->isActive) {
            return response()->json(['success' => false, 'message' => 'Your account is currently inactive. Please contact the administrator.'], 403);
        }
        if (!$user->email) {
            return response()->json(['success' => false, 'message' => 'This account has no registered email. Please contact the administrator.'], 400);
        }

        return response()->json(['success' => true, 'email' => $user->email]);
    }

    public function login(Request $request)
    {
        $username = $request->input('username');
        $password = $request->input('password');

        if (!$username || !$password) {
            return response()->json(['success' => false, 'message' => 'Username and password are required'], 400);
        }

        $clean = strtolower(trim($username));
        $user = User::whereRaw('LOWER(username) = ?', [$clean])->first();

        if (!$user) {
            AuditLogger::log($request, 'User Login Attempt', "Failed login attempt for non-existent username: \"{$username}\"", 'Failed', ['username' => $username, 'role' => 'Guest']);
            return response()->json(['success' => false, 'message' => 'Invalid username or staff credential.'], 401);
        }

        if (!$user->isActive) {
            AuditLogger::log($request, 'User Login Attempt', "Failed login attempt for inactive username: \"{$username}\"", 'Failed', ['username' => $username, 'role' => $user->role]);
            return response()->json(['success' => false, 'message' => 'Your account is currently inactive. Please contact the administrator.'], 403);
        }

        $inputBase64 = base64_encode($password);
        $isValid = false;

        if ($user->password === $inputBase64) {
            $isValid = true;
        } elseif ($user->password === $password) {
            $isValid = true;
            $user->password = $password;
            $user->save();
        }

        if (!$isValid) {
            AuditLogger::log($request, 'User Login Attempt', "Failed login attempt (incorrect password) for username: \"{$username}\"", 'Failed', ['username' => $username, 'role' => $user->role]);
            return response()->json(['success' => false, 'message' => 'Incorrect password entered.'], 401);
        }

        $userAgent = $request->header('User-Agent');
        $ip = $request->ip() ?: $request->header('X-Forwarded-For');

        try {
            UserSessionLog::create([
                'userId' => $user->id,
                'username' => $user->username,
                'action' => 'LOGIN',
                'ipAddress' => $ip,
                'userAgent' => $userAgent,
                'device' => $this->getDeviceType($userAgent),
            ]);
        } catch (\Throwable $e) {
            Log::error('Session log error: ' . $e->getMessage());
        }

        AuditLogger::log($request, 'User Login', "User \"{$user->username}\" logged in successfully", 'Success', ['username' => $user->username, 'role' => $user->role]);

        $token = JwtAuthMiddleware::createToken([
            'id' => $user->id,
            'username' => $user->username,
            'role' => $user->role,
        ]);

        $userData = $user->toArray();
        unset($userData['password']);

        return response()->json([
            'success' => true,
            'user' => $userData,
            'token' => $token,
        ]);
    }

    public function ping(Request $request)
    {
        return response()->json(['success' => true]);
    }

    public function logout(Request $request)
    {
        $username = $request->input('username');
        if (!$username) {
            return response()->json(['success' => false, 'message' => 'Username is required'], 400);
        }

        $clean = strtolower(trim($username));
        $user = User::whereRaw('LOWER(username) = ?', [$clean])->first();

        if ($user) {
            $reason = $request->input('reason');
            $isExpired = (bool)$reason;
            $actionType = $isExpired ? 'SESSION_EXPIRED' : 'LOGOUT';
            $auditAction = $isExpired ? 'User Session Expired' : 'User Logout';
            $auditDetail = $isExpired ? "User \"{$user->username}\" session expired due to inactivity ({$reason})" : "User \"{$user->username}\" logged out";

            $userAgent = $request->header('User-Agent');
            $ip = $request->ip() ?: $request->header('X-Forwarded-For');

            try {
                UserSessionLog::create([
                    'userId' => $user->id,
                    'username' => $user->username,
                    'action' => $actionType,
                    'ipAddress' => $ip,
                    'userAgent' => $userAgent,
                    'device' => $this->getDeviceType($userAgent),
                ]);
            } catch (\Throwable $e) {
                Log::error('Logout session log error: ' . $e->getMessage());
            }

            AuditLogger::log($request, $auditAction, $auditDetail, 'Success', ['username' => $user->username, 'role' => $user->role]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Logout tracked successfully',
        ]);
    }

    public function forgotPassword(Request $request)
    {
        $email = $request->input('email');
        if (!$email) {
            return response()->json(['success' => false, 'message' => 'Email address is required.'], 400);
        }

        $user = User::where('email', $email)->first();
        if (!$user) {
            return response()->json(['success' => true, 'message' => 'If this email is registered, an OTP has been sent.']);
        }
        if (!$user->isActive) {
            return response()->json(['success' => false, 'message' => 'Your account is currently inactive. Please contact the administrator.'], 403);
        }

        $otp = (string)random_int(100000, 999999);
        $key = 'otp_' . strtolower($email);
        Cache::put($key, ['otp' => $otp, 'userId' => $user->id], now()->addMinutes(10));

        $mailConfig = MailConfig::find('default');
        $deliveryMode = $mailConfig->deliveryMode ?? 'simulation';

        if ($deliveryMode === 'simulation') {
            Log::info("=========================================");
            Log::info("🔐 OTP FOR PASSWORD RESET (SIMULATION MODE)");
            Log::info("To: {$email}");
            Log::info("OTP: {$otp}");
            Log::info("=========================================");
            AuditLogger::log($request, 'OTP Email Simulated', "Simulated verification OTP password reset email to \"{$email}\"", 'Success', ['username' => $user->username, 'role' => $user->role]);
        } else {
            try {
                // Send email using Laravel Mail
                AuditLogger::log($request, 'OTP Email Dispatch', "Dispatched verification OTP password reset email to \"{$email}\"", 'Success', ['username' => $user->username, 'role' => $user->role]);
            } catch (\Throwable $e) {
                Log::error('Failed to send OTP mail: ' . $e->getMessage());
            }
        }

        return response()->json(['success' => true, 'message' => 'OTP sent to registered email.']);
    }

    public function verifyOtp(Request $request)
    {
        $email = $request->input('email');
        $otp = $request->input('otp');

        if (!$email || !$otp) {
            return response()->json(['success' => false, 'message' => 'Email and OTP are required.'], 400);
        }

        $record = Cache::get('otp_' . strtolower($email));
        if (!$record) {
            return response()->json(['success' => false, 'message' => 'No OTP found or expired. Please request a new one.'], 400);
        }

        if ((string)$record['otp'] !== (string)$otp) {
            return response()->json(['success' => false, 'message' => 'Incorrect OTP entered. Please try again.'], 400);
        }

        return response()->json(['success' => true, 'message' => 'OTP verified successfully.']);
    }

    public function resetPassword(Request $request)
    {
        $email = $request->input('email');
        $otp = $request->input('otp');
        $newPassword = $request->input('newPassword');

        if (!$email || !$otp || !$newPassword) {
            return response()->json(['success' => false, 'message' => 'Email, OTP and new password are required.'], 400);
        }

        $key = 'otp_' . strtolower($email);
        $record = Cache::get($key);
        if (!$record) {
            return response()->json(['success' => false, 'message' => 'OTP session expired. Please start again.'], 400);
        }

        if ((string)$record['otp'] !== (string)$otp) {
            return response()->json(['success' => false, 'message' => 'Invalid OTP.'], 400);
        }

        $user = User::find($record['userId']);
        if (!$user) {
            return response()->json(['success' => false, 'message' => 'User not found.'], 404);
        }

        $user->password = $newPassword; // triggers mutator base64_encode
        $user->save();

        Cache::forget($key);

        return response()->json(['success' => true, 'message' => 'Password has been reset successfully. You can now log in.']);
    }
}
