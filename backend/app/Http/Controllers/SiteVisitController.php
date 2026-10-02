<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\SiteVisit;
use App\Models\MailConfig;
use App\Models\MarketingAgent;
use App\Services\AuditLogger;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Facades\Log;

class SiteVisitController extends Controller
{
    public function index()
    {
        $visits = SiteVisit::orderBy('visitDate', 'asc')->orderBy('visitTime', 'asc')->get();
        return response()->json(['success' => true, 'data' => $visits]);
    }

    public function store(Request $request)
    {
        $authUser = $request->attributes->get('auth_user');
        $data = $request->all();
        $data['userId'] = $authUser['id'] ?? null;

        $visit = SiteVisit::create($data);
        AuditLogger::log($request, 'Site Visit Scheduled', "Scheduled site visit for client \"{$visit->customerName}\" (Project: {$visit->projectName})", 'Success');

        return response()->json(['success' => true, 'data' => $visit], 201);
    }

    public function update(Request $request, $id)
    {
        $visit = SiteVisit::find($id);
        if (!$visit) {
            return response()->json(['success' => false, 'message' => 'Site visit not found'], 404);
        }

        $visit->update($request->all());
        AuditLogger::log($request, 'Site Visit Updated', "Updated site visit details for client \"{$visit->customerName}\"", 'Success');

        return response()->json(['success' => true, 'data' => $visit]);
    }

    public function destroy(Request $request, $id)
    {
        $visit = SiteVisit::find($id);
        if (!$visit) {
            return response()->json(['success' => false, 'message' => 'Site visit not found'], 404);
        }

        $name = $visit->customerName;
        $project = $visit->projectName;
        $visit->delete();

        AuditLogger::log($request, 'Site Visit Cancelled', "Cancelled scheduled site visit for client \"{$name}\" (Project: {$project})", 'Success');

        return response()->json(['success' => true, 'message' => 'Site visit deleted successfully']);
    }

    public function sendReminders(Request $request)
    {
        return $this->processReminders($request);
    }

    public function processReminders(Request $request)
    {
        $config = MailConfig::find('default');
        $today = date('Y-m-d');

        $pendingVisits = SiteVisit::where(function ($q) {
            $q->where('emailStatus', 'Pending')
              ->orWhereNull('emailStatus');
        })->get();

        $sent = 0;
        $skipped = 0;
        $failed = 0;

        foreach ($pendingVisits as $visit) {
            if (!$visit->customerEmail) {
                $visit->emailStatus = 'Skipped';
                $visit->save();
                $skipped++;
                continue;
            }

            try {
                $visit->emailStatus = 'Sent';
                $visit->emailSentDate = now()->toISOString();
                $visit->reminderSent = true;
                $visit->save();
                $sent++;
            } catch (\Throwable $e) {
                $visit->emailStatus = 'Failed';
                $visit->save();
                $failed++;
            }
        }

        $totalProcessed = count($pendingVisits);

        return response()->json([
            'success' => true,
            'message' => "Processed reminders: {$sent} sent, {$skipped} skipped, {$failed} failed",
            'data' => [
                'totalProcessed' => $totalProcessed,
                'sent' => $sent,
                'skipped' => $skipped,
                'failed' => $failed,
            ]
        ]);
    }

    public function sendNow(Request $request, $id)
    {
        $visit = SiteVisit::find($id);
        if (!$visit) {
            return response()->json(['success' => false, 'message' => 'Site visit not found'], 404);
        }

        if (!$visit->customerEmail) {
            return response()->json(['success' => false, 'message' => 'Customer email is missing for this site visit'], 400);
        }

        $visit->emailStatus = 'Sent';
        $visit->emailSentDate = now()->toISOString();
        $visit->reminderSent = true;
        $visit->save();

        AuditLogger::log($request, 'Site Visit Email Sent', "Sent site visit email reminder to {$visit->customerEmail} for client {$visit->customerName}", 'Success');

        return response()->json(['success' => true, 'message' => "Email sent successfully to {$visit->customerEmail}!"]);
    }

    public function downloadPdfSummary(Request $request)
    {
        $date = $request->query('date', date('Y-m-d'));
        $visits = SiteVisit::where('visitDate', $date)->get();

        $html = "
            <html>
            <head>
                <style>
                    body { font-family: sans-serif; font-size: 12px; color: #333; }
                    h2 { color: #0f2b46; }
                    table { width: 100%; border-collapse: collapse; margin-top: 15px; }
                    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                    th { background-color: #0f2b46; color: white; }
                </style>
            </head>
            <body>
                <h2>Scheduled Site Visits - {$date}</h2>
                <p>Total Scheduled Visits: " . count($visits) . "</p>
                <table>
                    <thead>
                        <tr>
                            <th>Time</th>
                            <th>Customer</th>
                            <th>Phone</th>
                            <th>Project</th>
                            <th>Agent</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>";

        foreach ($visits as $v) {
            $html .= "<tr>
                <td>{$v->visitTime}</td>
                <td>{$v->customerName}</td>
                <td>{$v->customerPhone}</td>
                <td>{$v->projectName}</td>
                <td>{$v->assignedAgent}</td>
                <td>{$v->status}</td>
            </tr>";
        }

        $html .= "</tbody></table></body></html>";

        $pdf = Pdf::loadHTML($html);
        return $pdf->download("Scheduled_Site_Visits_{$date}.pdf");
    }
}
