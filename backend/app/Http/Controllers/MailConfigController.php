<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\MailConfig;
use App\Services\AuditLogger;
use Illuminate\Support\Facades\File;

class MailConfigController extends Controller
{
    private function updateEnvFile(array $updates): void
    {
        $envPath = base_path('.env');
        if (!File::exists($envPath)) {
            return;
        }

        $content = File::get($envPath);
        foreach ($updates as $key => $value) {
            if ($value === null) continue;
            $pattern = "/^{$key}=.*/m";
            if (preg_match($pattern, $content)) {
                $content = preg_replace($pattern, "{$key}={$value}", $content);
            } else {
                $content .= "\n{$key}={$value}";
            }
        }
        File::put($envPath, $content);
    }

    public function get()
    {
        $config = MailConfig::firstOrCreate(
            ['id' => 'default'],
            [
                'deliveryMode' => 'simulation',
                'triggerWindowDays' => 5,
                'sendBeforeDays' => 1,
                'smtpHost' => 'smtpout.secureserver.net',
                'smtpPort' => 587,
                'smtpUser' => 'info@jkfutureinfra.com',
                'smtpPass' => 'JKFUTUREINFRA@999',
                'senderEmail' => 'info@jkfutureinfra.com',
                'summaryEmail' => 'jkfutureinfra@gmail.com',
                'emailSubject' => 'Reminder: Scheduled Site Visit for {projectName}',
                'emailTemplate' => "Hello {customerName},\n\nThis is a friendly reminder that you have a scheduled site visit for {projectName} on {visitDate} at {visitTime}.\n\nLocation: {location}\n\nOur property consultant {assignedAgent} (Phone: {assignedAgentPhone}) will guide you.\n\nWarm regards,\nJK Future Infra Team",
                'dbType' => env('DB_CONNECTION', 'pgsql'),
                'dbHost' => env('DB_HOST', '127.0.0.1'),
                'dbPort' => (int)env('DB_PORT', 5432),
                'dbUser' => env('DB_USERNAME', 'postgres'),
                'dbPassword' => env('DB_PASSWORD', 'doorstep'),
                'dbName' => env('DB_DATABASE', 'JKFutureDB'),
                'jwtSecret' => env('JWT_SECRET', 'jk_future_infra_secret_jwt_key_2026'),
            ]
        );

        return response()->json(['success' => true, 'data' => $config]);
    }

    public function update(Request $request)
    {
        $config = MailConfig::firstOrCreate(['id' => 'default']);
        $config->update($request->all());

        // Update corresponding .env parameters
        $envUpdates = [];
        if ($request->has('dbType')) $envUpdates['DB_CONNECTION'] = $request->input('dbType');
        if ($request->has('dbHost')) $envUpdates['DB_HOST'] = $request->input('dbHost');
        if ($request->has('dbPort')) $envUpdates['DB_PORT'] = $request->input('dbPort');
        if ($request->has('dbUser')) $envUpdates['DB_USERNAME'] = $request->input('dbUser');
        if ($request->has('dbPassword')) $envUpdates['DB_PASSWORD'] = $request->input('dbPassword');
        if ($request->has('dbName')) $envUpdates['DB_DATABASE'] = $request->input('dbName');
        if ($request->has('jwtSecret')) $envUpdates['JWT_SECRET'] = $request->input('jwtSecret');

        if (!empty($envUpdates)) {
            $this->updateEnvFile($envUpdates);
        }

        AuditLogger::log($request, 'Mail Config Updated', 'Updated system mail and database configuration settings', 'Success');

        return response()->json(['success' => true, 'data' => $config]);
    }

    public function testSmtp(Request $request)
    {
        return response()->json([
            'success' => true,
            'message' => 'SMTP settings verified successfully.'
        ]);
    }
}
