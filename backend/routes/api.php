<?php

use Illuminate\Support\Facades\Route;

use App\Http\Controllers\AuthController;
use App\Http\Controllers\ProjectController;
use App\Http\Controllers\BlogController;
use App\Http\Controllers\GalleryController;
use App\Http\Controllers\EnquiryController;
use App\Http\Controllers\MasterController;
use App\Http\Controllers\CareerController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\UploadController;
use App\Http\Controllers\DocumentController;
use App\Http\Controllers\SiteVisitController;
use App\Http\Controllers\MailConfigController;
use App\Http\Controllers\MarketingAgentController;
use App\Http\Controllers\ExpenseController;
use App\Http\Controllers\ExpenseCategoryController;
use App\Http\Controllers\AuditLogController;
use App\Http\Controllers\WalletController;
use App\Http\Controllers\QuotationController;
use App\Http\Controllers\InventoryController;
use App\Http\Controllers\LoanController;
use App\Http\Controllers\CustomerController;
use App\Http\Controllers\SupplierController;
use App\Http\Controllers\InvoiceController;
use App\Http\Controllers\PaymentController;
use App\Http\Controllers\AccountingActivityController;
use App\Http\Controllers\CostAnalysisController;
use App\Http\Controllers\DailyAgendaController;
use App\Http\Controllers\ProjectInspectionController;
use App\Http\Controllers\CompanyProfileController;

// Health check
Route::get('/health', function () {
    return response()->json([
        'status' => 'ok',
        'timestamp' => now()->toIso8601String()
    ]);
});

// Auth Routes
Route::prefix('auth')->group(function () {
    Route::get('/user-email/{username}', [AuthController::class, 'getUserEmail']);
    Route::post('/login', [AuthController::class, 'login']);
    Route::get('/ping', [AuthController::class, 'ping']);
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::post('/forgot-password', [AuthController::class, 'forgotPassword']);
    Route::post('/verify-otp', [AuthController::class, 'verifyOtp']);
    Route::post('/reset-password', [AuthController::class, 'resetPassword']);
});

// Projects
Route::prefix('projects')->group(function () {
    Route::get('/', [ProjectController::class, 'index']);
    Route::get('/{id}', [ProjectController::class, 'show']);
    Route::post('/', [ProjectController::class, 'store'])->middleware('jwt.auth');
    Route::put('/{id}', [ProjectController::class, 'update'])->middleware('jwt.auth');
    Route::delete('/{id}', [ProjectController::class, 'destroy'])->middleware('jwt.auth');
});

// Blogs
Route::prefix('blogs')->group(function () {
    Route::get('/', [BlogController::class, 'index']);
    Route::get('/slug/{slug}', [BlogController::class, 'showBySlug']);
    Route::get('/{id}', [BlogController::class, 'show']);
    Route::post('/', [BlogController::class, 'store'])->middleware('jwt.auth');
    Route::put('/{id}', [BlogController::class, 'update'])->middleware('jwt.auth');
    Route::delete('/{id}', [BlogController::class, 'destroy'])->middleware('jwt.auth');
});

// Gallery
Route::prefix('gallery')->group(function () {
    Route::get('/', [GalleryController::class, 'index']);
    Route::post('/', [GalleryController::class, 'store'])->middleware('jwt.auth');
    Route::put('/{id}', [GalleryController::class, 'update'])->middleware('jwt.auth');
    Route::delete('/{id}', [GalleryController::class, 'destroy'])->middleware('jwt.auth');
});

// Enquiries
Route::prefix('enquiries')->group(function () {
    Route::get('/', [EnquiryController::class, 'index'])->middleware('jwt.auth');
    Route::post('/', [EnquiryController::class, 'store']);
    Route::put('/{id}', [EnquiryController::class, 'update'])->middleware('jwt.auth');
    Route::delete('/{id}', [EnquiryController::class, 'destroy'])->middleware('jwt.auth');
});

// Masters
Route::prefix('masters')->group(function () {
    Route::get('/cities', [MasterController::class, 'getCities']);
    Route::post('/cities', [MasterController::class, 'storeCity'])->middleware('jwt.auth');
    Route::delete('/cities/{id}', [MasterController::class, 'destroyCity'])->middleware('jwt.auth');

    Route::get('/locations', [MasterController::class, 'getLocations']);
    Route::post('/locations', [MasterController::class, 'storeLocation'])->middleware('jwt.auth');
    Route::delete('/locations/{id}', [MasterController::class, 'destroyLocation'])->middleware('jwt.auth');

    Route::get('/property-types', [MasterController::class, 'getPropertyTypes']);
    Route::post('/property-types', [MasterController::class, 'storePropertyType'])->middleware('jwt.auth');
    Route::delete('/property-types/{id}', [MasterController::class, 'destroyPropertyType'])->middleware('jwt.auth');

    Route::get('/facings', [MasterController::class, 'getFacings']);
    Route::post('/facings', [MasterController::class, 'storeFacing'])->middleware('jwt.auth');
    Route::delete('/facings/{id}', [MasterController::class, 'destroyFacing'])->middleware('jwt.auth');

    Route::get('/amenities', [MasterController::class, 'getAmenities']);
    Route::post('/amenities', [MasterController::class, 'storeAmenity'])->middleware('jwt.auth');
    Route::delete('/amenities/{id}', [MasterController::class, 'destroyAmenity'])->middleware('jwt.auth');
});

// Careers
Route::prefix('careers')->group(function () {
    Route::get('/applications', [CareerController::class, 'getApplications'])->middleware('jwt.auth');
    Route::post('/apply', [CareerController::class, 'apply']);
    Route::put('/applications/{id}', [CareerController::class, 'updateApplication'])->middleware('jwt.auth');
    Route::delete('/applications/{id}', [CareerController::class, 'destroyApplication'])->middleware('jwt.auth');
});

// Users
Route::prefix('users')->middleware('jwt.auth')->group(function () {
    Route::get('/logs/session', [UserController::class, 'getSessionLogs']);
    Route::get('/', [UserController::class, 'index']);
    Route::post('/', [UserController::class, 'store']);
    Route::put('/{id}', [UserController::class, 'update']);
    Route::delete('/{id}', [UserController::class, 'destroy']);
});

// File Uploads
Route::prefix('upload')->group(function () {
    Route::post('/', [UploadController::class, 'uploadSingle']);
    Route::post('/multiple', [UploadController::class, 'uploadMultiple']);
});

// Documents
Route::prefix('documents')->group(function () {
    Route::get('/', [DocumentController::class, 'index']);
    Route::put('/reorder', [DocumentController::class, 'reorder'])->middleware('jwt.auth');
    Route::get('/{id}', [DocumentController::class, 'show']);
    Route::post('/', [DocumentController::class, 'store'])->middleware('jwt.auth');
    Route::put('/{id}', [DocumentController::class, 'update'])->middleware('jwt.auth');
    Route::delete('/{id}', [DocumentController::class, 'destroy'])->middleware('jwt.auth');
});

// Site Visits
Route::prefix('site-visits')->middleware('jwt.auth')->group(function () {
    Route::get('/', [SiteVisitController::class, 'index']);
    Route::post('/', [SiteVisitController::class, 'store']);
    Route::put('/{id}', [SiteVisitController::class, 'update']);
    Route::delete('/{id}', [SiteVisitController::class, 'destroy']);
    Route::post('/process-reminders', [SiteVisitController::class, 'processReminders']);
    Route::post('/reminders', [SiteVisitController::class, 'sendReminders']);
    Route::post('/{id}/send-now', [SiteVisitController::class, 'sendNow']);
    Route::get('/download-pdf', [SiteVisitController::class, 'downloadPdfSummary']);
});

// Mail Config
Route::prefix('mail-config')->middleware('jwt.auth')->group(function () {
    Route::get('/', [MailConfigController::class, 'get']);
    Route::put('/', [MailConfigController::class, 'update']);
    Route::post('/test', [MailConfigController::class, 'testSmtp']);
    Route::post('/test-smtp', [MailConfigController::class, 'testSmtp']);
});

// Marketing Agents
Route::prefix('marketing-agents')->group(function () {
    Route::get('/', [MarketingAgentController::class, 'index']);
    Route::get('/{id}', [MarketingAgentController::class, 'show']);
    Route::post('/', [MarketingAgentController::class, 'store'])->middleware('jwt.auth');
    Route::put('/{id}', [MarketingAgentController::class, 'update'])->middleware('jwt.auth');
    Route::delete('/{id}', [MarketingAgentController::class, 'destroy'])->middleware('jwt.auth');
});

// Expenses
Route::prefix('expenses')->middleware('jwt.auth')->group(function () {
    Route::get('/', [ExpenseController::class, 'index']);
    Route::get('/{id}', [ExpenseController::class, 'show']);
    Route::post('/', [ExpenseController::class, 'store']);
    Route::put('/{id}', [ExpenseController::class, 'update']);
    Route::delete('/{id}', [ExpenseController::class, 'destroy']);
});

// Expense Categories
Route::prefix('expense-categories')->middleware('jwt.auth')->group(function () {
    Route::get('/', [ExpenseCategoryController::class, 'index']);
    Route::post('/', [ExpenseCategoryController::class, 'store']);
    Route::put('/{id}', [ExpenseCategoryController::class, 'update']);
    Route::delete('/{id}', [ExpenseCategoryController::class, 'destroy']);
});

// Audit Logs
Route::prefix('audit-logs')->middleware('jwt.auth')->group(function () {
    Route::get('/', [AuditLogController::class, 'index']);
    Route::post('/', [AuditLogController::class, 'store']);
    Route::delete('/', [AuditLogController::class, 'clear']);
});

// Wallets
Route::prefix('wallets')->middleware('jwt.auth')->group(function () {
    Route::get('/transactions', [WalletController::class, 'getTransactions']);
    Route::post('/add-money', [WalletController::class, 'addMoney']);
    Route::post('/withdraw-money', [WalletController::class, 'withdrawMoney']);
    Route::post('/transfer', [WalletController::class, 'transfer']);
    Route::get('/', [WalletController::class, 'index']);
    Route::get('/{id}', [WalletController::class, 'show']);
    Route::post('/', [WalletController::class, 'store']);
    Route::put('/{id}', [WalletController::class, 'update']);
    Route::delete('/{id}', [WalletController::class, 'destroy']);
});

// Quotations
Route::prefix('quotations')->middleware('jwt.auth')->group(function () {
    Route::get('/', [QuotationController::class, 'index']);
    Route::get('/{id}', [QuotationController::class, 'show']);
    Route::post('/', [QuotationController::class, 'store']);
    Route::put('/{id}', [QuotationController::class, 'update']);
    Route::delete('/{id}', [QuotationController::class, 'destroy']);
});

// Inventory
Route::prefix('inventory')->middleware('jwt.auth')->group(function () {
    Route::get('/movements', [InventoryController::class, 'getMovements']);
    Route::post('/movement', [InventoryController::class, 'createMovement']);
    Route::post('/stock-in', [InventoryController::class, 'stockIn']);
    Route::post('/stock-out', [InventoryController::class, 'stockOut']);
    Route::post('/adjust', [InventoryController::class, 'adjust']);
    Route::get('/', [InventoryController::class, 'index']);
    Route::get('/{id}', [InventoryController::class, 'show']);
    Route::post('/', [InventoryController::class, 'store']);
    Route::put('/{id}', [InventoryController::class, 'update']);
    Route::delete('/{id}', [InventoryController::class, 'destroy']);
});

// Loans
Route::prefix('loans')->middleware('jwt.auth')->group(function () {
    Route::get('/payments', [LoanController::class, 'getPayments']);
    Route::post('/payments', [LoanController::class, 'createPayment']);
    Route::post('/{id}/pay-emi', [LoanController::class, 'payEmi']);
    Route::get('/', [LoanController::class, 'index']);
    Route::get('/{id}', [LoanController::class, 'show']);
    Route::post('/', [LoanController::class, 'store']);
    Route::put('/{id}', [LoanController::class, 'update']);
    Route::delete('/{id}', [LoanController::class, 'destroy']);
});

// Customers
Route::prefix('customers')->middleware('jwt.auth')->group(function () {
    Route::get('/', [CustomerController::class, 'index']);
    Route::get('/{id}', [CustomerController::class, 'show']);
    Route::post('/', [CustomerController::class, 'store']);
    Route::put('/{id}', [CustomerController::class, 'update']);
    Route::delete('/{id}', [CustomerController::class, 'destroy']);
});

// Suppliers
Route::prefix('suppliers')->middleware('jwt.auth')->group(function () {
    Route::get('/', [SupplierController::class, 'index']);
    Route::get('/{id}', [SupplierController::class, 'show']);
    Route::post('/', [SupplierController::class, 'store']);
    Route::put('/{id}', [SupplierController::class, 'update']);
    Route::delete('/{id}', [SupplierController::class, 'destroy']);
});

// Invoices
Route::prefix('invoices')->middleware('jwt.auth')->group(function () {
    Route::get('/', [InvoiceController::class, 'index']);
    Route::get('/{id}', [InvoiceController::class, 'show']);
    Route::post('/', [InvoiceController::class, 'store']);
    Route::put('/{id}', [InvoiceController::class, 'update']);
    Route::delete('/{id}', [InvoiceController::class, 'destroy']);
});

// Payments
Route::prefix('payments')->middleware('jwt.auth')->group(function () {
    Route::get('/in', [PaymentController::class, 'getPaymentsIn']);
    Route::post('/in', [PaymentController::class, 'storePaymentIn']);
    Route::put('/in/{id}', [PaymentController::class, 'updatePaymentIn']);
    Route::delete('/in/{id}', [PaymentController::class, 'destroyPaymentIn']);

    Route::get('/out', [PaymentController::class, 'getPaymentsOut']);
    Route::post('/out', [PaymentController::class, 'storePaymentOut']);
    Route::put('/out/{id}', [PaymentController::class, 'updatePaymentOut']);
    Route::delete('/out/{id}', [PaymentController::class, 'destroyPaymentOut']);

    Route::get('/pending', [PaymentController::class, 'getPending']);
});

// Accounting Activities
Route::prefix('accounting-activities')->middleware('jwt.auth')->group(function () {
    Route::get('/', [AccountingActivityController::class, 'index']);
});

// Cost Analyses
Route::prefix('cost-analyses')->middleware('jwt.auth')->group(function () {
    Route::get('/', [CostAnalysisController::class, 'index']);
    Route::get('/{id}', [CostAnalysisController::class, 'show']);
    Route::post('/', [CostAnalysisController::class, 'store']);
    Route::put('/{id}', [CostAnalysisController::class, 'update']);
    Route::delete('/{id}', [CostAnalysisController::class, 'destroy']);
});

// Daily Agenda Matrix
Route::prefix('daily-agenda')->middleware('jwt.auth')->group(function () {
    Route::get('/', [DailyAgendaController::class, 'index']);
    Route::post('/', [DailyAgendaController::class, 'store']);
    Route::delete('/{id}', [DailyAgendaController::class, 'destroy']);
});

// Project Inspections
Route::prefix('project-inspections')->middleware('jwt.auth')->group(function () {
    Route::get('/', [ProjectInspectionController::class, 'index']);
    Route::get('/project/{projectId}', [ProjectInspectionController::class, 'showByProject']);
    Route::post('/', [ProjectInspectionController::class, 'store']);
    Route::delete('/{id}', [ProjectInspectionController::class, 'destroy']);
});

// Company Profile & Branding
Route::prefix('company-profile')->group(function () {
    Route::get('/', [CompanyProfileController::class, 'show']);
    Route::post('/', [CompanyProfileController::class, 'update'])->middleware('jwt.auth');
    Route::put('/', [CompanyProfileController::class, 'update'])->middleware('jwt.auth');
    Route::post('/upload-logo', [CompanyProfileController::class, 'uploadLogo'])->middleware('jwt.auth');
});
