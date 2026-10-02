<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. user_session_logs
        Schema::create('user_session_logs', function (Blueprint $table) {
            $table->id();
            $table->string('userId');
            $table->string('username');
            $table->string('action');
            $table->string('ipAddress')->nullable();
            $table->text('userAgent')->nullable();
            $table->string('device')->nullable();
            $table->timestamps();
        });

        // 2. audit_logs
        Schema::create('audit_logs', function (Blueprint $table) {
            $table->id();
            $table->string('user')->default('Anonymous');
            $table->string('role')->default('Guest');
            $table->string('action');
            $table->text('details')->nullable();
            $table->string('ip')->nullable();
            $table->string('status')->default('Success');
            $table->string('userId')->nullable();
            $table->timestamps();
        });

        // 3. mail_configs
        Schema::create('mail_configs', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('deliveryMode')->default('simulation');
            $table->integer('triggerWindowDays')->default(5);
            $table->integer('sendBeforeDays')->default(1);
            $table->string('smtpHost')->default('smtpout.secureserver.net');
            $table->integer('smtpPort')->default(587);
            $table->string('smtpUser')->nullable();
            $table->string('smtpPass')->nullable();
            $table->string('senderEmail')->default('info@jkfutureinfra.com');
            $table->string('summaryEmail')->default('jkfutureinfra@gmail.com');
            $table->string('emailSubject')->default('Reminder: Scheduled Site Visit for {projectName}');
            $table->text('emailTemplate')->nullable();
            $table->string('smsProvider')->nullable();
            $table->string('smsApiKey')->nullable();
            $table->string('smsSenderId')->nullable();
            $table->boolean('smsEnabled')->default(false);
            $table->string('whatsappToken')->nullable();
            $table->string('whatsappPhoneId')->nullable();
            $table->boolean('whatsappEnabled')->default(false);
            $table->string('dbType')->nullable()->default('postgres');
            $table->string('dbHost')->nullable();
            $table->integer('dbPort')->nullable();
            $table->string('dbUser')->nullable();
            $table->string('dbPassword')->nullable();
            $table->string('dbName')->nullable();
            $table->string('jwtSecret')->nullable();
            $table->string('facebookPageId')->nullable();
            $table->text('facebookPageAccessToken')->nullable();
            $table->string('instagramAccountId')->nullable();
            $table->string('userId')->nullable();
            $table->timestamps();
        });

        // 4. cities
        Schema::create('cities', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('name');
            $table->string('state')->default('Andhra Pradesh');
            $table->string('userId')->nullable();
            $table->timestamps();
        });

        // 5. location_masters
        Schema::create('location_masters', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('name');
            $table->string('cityId');
            $table->string('userId')->nullable();
            $table->timestamps();
        });

        // 6. property_types
        Schema::create('property_types', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('name');
            $table->string('userId')->nullable();
            $table->timestamps();
        });

        // 7. facings
        Schema::create('facings', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('name');
            $table->string('userId')->nullable();
            $table->timestamps();
        });

        // 8. amenities
        Schema::create('amenities', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('name');
            $table->string('userId')->nullable();
            $table->timestamps();
        });

        // 9. marketing_agents
        Schema::create('marketing_agents', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('name');
            $table->string('phone')->nullable();
            $table->string('email')->nullable();
            $table->string('designation')->nullable();
            $table->text('photoUrl')->nullable();
            $table->string('agencyName')->nullable();
            $table->string('reraNumber')->nullable();
            $table->string('status')->default('Active');
            $table->text('notes')->nullable();
            $table->string('userId')->nullable();
            $table->timestamps();
        });

        // 10. projects
        Schema::create('projects', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->text('name');
            $table->text('category');
            $table->text('subCategory')->nullable();
            $table->text('status');
            $table->text('location');
            $table->text('description');
            $table->text('overview')->nullable();
            $table->double('price')->nullable();
            $table->text('priceRange')->nullable();
            $table->bigInteger('priceValue')->default(0);
            $table->text('area')->nullable();
            $table->text('facing')->nullable();
            $table->text('propertyType')->nullable();
            $table->longText('amenities')->nullable();
            $table->longText('specifications')->nullable();
            $table->longText('images')->nullable();
            $table->longText('videos')->nullable();
            $table->longText('highlights')->nullable();
            $table->text('brochureUrl')->nullable();
            $table->text('videoUrl')->nullable();
            $table->longText('floorPlans')->nullable();
            $table->longText('timeline')->nullable();
            $table->longText('paymentPlans')->nullable();
            $table->longText('mapCoordinates')->nullable();
            $table->text('reraNumber')->nullable();
            $table->boolean('featured')->default(false);
            $table->text('city')->nullable();
            $table->text('microLocation')->nullable();
            $table->integer('floors')->nullable();
            $table->integer('unitsCount')->nullable();
            $table->text('availabilityDetails')->nullable();
            $table->text('specImage')->nullable();
            $table->text('uds')->nullable();
            $table->text('width')->nullable();
            $table->text('length')->nullable();
            $table->text('classification')->nullable();
            $table->boolean('isActive')->default(true);
            $table->text('remarks')->nullable();
            $table->text('marketingResult')->nullable();
            $table->string('agentId')->nullable();
            $table->string('referredByName')->nullable();
            $table->string('referredByPhone')->nullable();
            $table->text('referredRemarks')->nullable();
            $table->boolean('isMarketing')->default(false);
            $table->string('userId')->nullable();
            $table->timestamps();
        });

        // 11. blogs
        Schema::create('blogs', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->text('title');
            $table->text('slug');
            $table->text('summary')->nullable();
            $table->text('excerpt')->nullable();
            $table->longText('content');
            $table->text('category')->nullable();
            $table->text('author')->nullable();
            $table->text('image')->nullable();
            $table->text('coverImage')->nullable();
            $table->string('date')->nullable();
            $table->longText('tags')->nullable();
            $table->text('readTime')->nullable();
            $table->boolean('published')->default(true);
            $table->timestamp('publishedAt')->nullable();
            $table->string('userId')->nullable();
            $table->timestamps();
        });

        // 12. gallery_items
        Schema::create('gallery_items', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->text('title');
            $table->text('category');
            $table->string('type')->default('image');
            $table->text('url')->nullable();
            $table->text('imageUrl')->nullable();
            $table->text('thumbnail')->nullable();
            $table->string('date')->nullable();
            $table->text('projectAssociation')->nullable();
            $table->boolean('isMarketing')->default(false);
            $table->string('userId')->nullable();
            $table->timestamps();
        });

        // 13. enquiries
        Schema::create('enquiries', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->text('name');
            $table->text('email')->nullable();
            $table->text('phone');
            $table->text('project')->nullable();
            $table->text('projectName')->nullable();
            $table->text('projectAssociation')->nullable();
            $table->text('propertyType')->nullable();
            $table->text('message')->nullable();
            $table->text('status')->default('New');
            $table->string('date')->nullable();
            $table->text('notes')->nullable();
            $table->boolean('isMarketing')->default(false);
            $table->string('agentId')->nullable();
            $table->string('userId')->nullable();
            $table->timestamps();
        });

        // 14. job_applications
        Schema::create('job_applications', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('position');
            $table->string('name')->nullable();
            $table->string('applicantName')->nullable();
            $table->string('email');
            $table->string('phone');
            $table->string('experience')->nullable();
            $table->string('resumeUrl')->nullable();
            $table->text('coverLetter')->nullable();
            $table->string('status')->default('Pending');
            $table->string('date')->nullable();
            $table->text('notes')->nullable();
            $table->string('userId')->nullable();
            $table->timestamps();
        });

        // 15. documents
        Schema::create('documents', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->text('title');
            $table->text('category');
            $table->text('fileUrl');
            $table->text('fileSize')->nullable();
            $table->text('fileType')->nullable();
            $table->text('projectAssociation')->nullable();
            $table->string('uploadedBy')->nullable();
            $table->string('date')->nullable();
            $table->integer('sortOrder')->default(0);
            $table->string('userId')->nullable();
            $table->timestamps();
        });

        // 16. site_visits
        Schema::create('site_visits', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->text('customerName');
            $table->text('customerPhone');
            $table->text('customerEmail')->nullable();
            $table->text('projectAssociation')->nullable();
            $table->text('projectName');
            $table->string('visitDate');
            $table->string('visitTime');
            $table->string('emailStatus')->default('Pending');
            $table->string('emailSentDate')->nullable();
            $table->text('assignedAgent')->nullable();
            $table->text('assignedAgentPhone')->nullable();
            $table->text('status')->default('Scheduled');
            $table->text('location')->nullable();
            $table->text('notes')->nullable();
            $table->boolean('reminderSent')->default(false);
            $table->text('feedback')->nullable();
            $table->string('userId')->nullable();
            $table->timestamps();
        });

        // 17. wallets
        Schema::create('wallets', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('name');
            $table->double('openingBalance')->default(0);
            $table->double('currentBalance')->default(0);
            $table->string('type');
            $table->string('userId')->nullable();
            $table->timestamps();
        });

        // 18. wallet_transactions
        Schema::create('wallet_transactions', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('walletId');
            $table->string('toWalletId')->nullable();
            $table->string('type');
            $table->double('amount');
            $table->string('date');
            $table->string('paymentMode')->default('Cash');
            $table->string('referenceNumber')->nullable();
            $table->text('description')->nullable();
            $table->string('receiptUrl')->nullable();
            $table->string('userId')->nullable();
            $table->timestamps();
        });

        // 19. customers
        Schema::create('customers', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('name');
            $table->string('mobile');
            $table->string('email')->nullable();
            $table->text('address')->nullable();
            $table->string('gstNumber')->nullable();
            $table->double('creditLimit')->default(0);
            $table->double('openingBalance')->default(0);
            $table->double('outstandingAmount')->default(0);
            $table->string('userId')->nullable();
            $table->timestamps();
        });

        // 20. suppliers
        Schema::create('suppliers', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('name');
            $table->string('contactNumber')->default('N/A');
            $table->text('address')->nullable();
            $table->string('gstNumber')->nullable();
            $table->double('openingBalance')->default(0);
            $table->double('outstandingAmount')->default(0);
            $table->string('userId')->nullable();
            $table->timestamps();
        });

        // 21. inventory_items
        Schema::create('inventory_items', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('name');
            $table->string('code')->unique();
            $table->string('category')->nullable();
            $table->string('brand')->nullable();
            $table->string('unit')->default('Pcs');
            $table->double('openingStock')->default(0);
            $table->double('purchasePrice')->default(0);
            $table->double('sellingPrice')->default(0);
            $table->double('gstPercentage')->default(0);
            $table->double('currentStock')->default(0);
            $table->double('minimumStockLevel')->default(0);
            $table->string('supplierName')->nullable();
            $table->string('warehouseLocation')->nullable();
            $table->string('type')->default('Product');
            $table->string('hsn')->nullable();
            $table->text('image')->nullable();
            $table->boolean('batchTracking')->default(false);
            $table->string('sellingPriceTaxType')->default('Without Tax');
            $table->string('purchasePriceTaxType')->default('Without Tax');
            $table->longText('batches')->nullable();
            $table->string('userId')->nullable();
            $table->timestamps();
        });

        // 22. stock_movements
        Schema::create('stock_movements', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('productCode');
            $table->string('type');
            $table->double('quantity');
            $table->string('date');
            $table->string('warehouse')->nullable();
            $table->text('notes')->nullable();
            $table->string('userId')->nullable();
            $table->timestamps();
        });

        // 23. expense_categories
        Schema::create('expense_categories', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('name');
            $table->text('description')->nullable();
            $table->string('userId')->nullable();
            $table->timestamps();
        });

        // 24. expenses
        Schema::create('expenses', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('expenseNo')->nullable();
            $table->string('party');
            $table->string('expenseCategory');
            $table->string('billDate');
            $table->string('paymentType');
            $table->string('stateOfSupply')->nullable();
            $table->string('walletId')->nullable();
            $table->string('accountName')->nullable();
            $table->string('referenceNo')->nullable();
            $table->boolean('roundOff')->default(true);
            $table->double('totalAmount')->default(0);
            $table->double('paidAmount')->default(0);
            $table->double('pendingAmount')->default(0);
            $table->string('paymentStatus')->default('Paid');
            $table->text('notes')->nullable();
            $table->string('location')->nullable();
            $table->string('apartment')->nullable();
            $table->string('projectName')->nullable();
            $table->longText('items')->nullable();
            $table->longText('lineItems')->nullable();
            $table->string('userId')->nullable();
            $table->timestamps();
        });

        // 25. quotations
        Schema::create('quotations', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('quotationNumber');
            $table->string('customerName');
            $table->string('customerMobile');
            $table->text('customerAddress')->nullable();
            $table->string('date');
            $table->string('validTillDate');
            $table->longText('items');
            $table->longText('amenityItems')->nullable();
            $table->double('totalAmount')->default(0);
            $table->text('notes')->nullable();
            $table->text('termsAndConditions')->nullable();
            $table->string('status')->default('Draft');
            $table->string('projectName')->nullable();
            $table->string('convertedInvoiceId')->nullable();
            $table->string('convertedInvoiceNumber')->nullable();
            $table->string('userId')->nullable();
            $table->timestamps();
        });

        // 26. invoices
        Schema::create('invoices', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('invoiceNumber');
            $table->string('customerName');
            $table->string('customerMobile')->nullable();
            $table->text('customerAddress')->nullable();
            $table->string('projectName')->nullable();
            $table->string('date');
            $table->longText('items');
            $table->longText('amenityItems')->nullable();
            $table->double('totalAmount')->default(0);
            $table->double('gstAmount')->default(0);
            $table->double('discountAmount')->default(0);
            $table->double('paidAmount')->default(0);
            $table->double('pendingAmount')->default(0);
            $table->string('paymentStatus')->default('Unpaid');
            $table->text('termsAndConditions')->nullable();
            $table->text('notes')->nullable();
            $table->string('quotationId')->nullable();
            $table->string('quotationNumber')->nullable();
            $table->string('userId')->nullable();
            $table->timestamps();
        });

        // 27. loans
        Schema::create('loans', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('providerName');
            $table->string('accountNumber');
            $table->string('type');
            $table->double('amount');
            $table->double('interestRate');
            $table->string('startDate');
            $table->string('endDate');
            $table->double('emiAmount')->default(0);
            $table->string('frequency')->default('Monthly');
            $table->double('paidAmount')->default(0);
            $table->double('pendingAmount')->default(0);
            $table->string('nextDueDate')->nullable();
            $table->string('documentUrl')->nullable();
            $table->string('userId')->nullable();
            $table->timestamps();
        });

        // 28. loan_payments
        Schema::create('loan_payments', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('loanId');
            $table->string('paymentDate');
            $table->double('amount');
            $table->double('principalComponent')->default(0);
            $table->double('interestComponent')->default(0);
            $table->string('paymentMethod')->default('Bank Transfer');
            $table->string('referenceNumber')->nullable();
            $table->string('reference')->nullable();
            $table->string('walletId')->nullable();
            $table->string('accountName')->nullable();
            $table->boolean('isInterestOnly')->default(false);
            $table->text('notes')->nullable();
            $table->string('userId')->nullable();
            $table->timestamps();
        });

        // 29. payments_in
        Schema::create('payments_in', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('customerName');
            $table->string('invoiceNumber')->nullable();
            $table->string('paymentDate');
            $table->double('amount');
            $table->string('paymentMethod');
            $table->string('walletId')->nullable();
            $table->string('accountName')->nullable();
            $table->string('referenceNumber')->nullable();
            $table->string('receiptNo')->nullable();
            $table->string('status')->default('Used');
            $table->double('unusedAmount')->default(0);
            $table->longText('linkedTxns')->nullable();
            $table->string('attachmentUrl')->nullable();
            $table->text('notes')->nullable();
            $table->string('userId')->nullable();
            $table->timestamps();
        });

        // 30. payments_out
        Schema::create('payments_out', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('supplierName');
            $table->string('billNumber')->nullable();
            $table->string('paymentDate');
            $table->double('amount');
            $table->string('paymentMethod');
            $table->string('walletId')->nullable();
            $table->string('accountName')->nullable();
            $table->string('referenceNumber')->nullable();
            $table->string('receiptNo')->nullable();
            $table->string('status')->default('Used');
            $table->double('unusedAmount')->default(0);
            $table->longText('linkedTxns')->nullable();
            $table->string('attachmentUrl')->nullable();
            $table->text('notes')->nullable();
            $table->string('userId')->nullable();
            $table->timestamps();
        });

        // 31. accounting_activities
        Schema::create('accounting_activities', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->dateTime('dateTime');
            $table->string('module');
            $table->string('activityType');
            $table->string('recordId');
            $table->double('amount')->nullable();
            $table->text('description');
            $table->string('userId')->nullable();
            $table->string('userName')->nullable();
            $table->string('userRole')->default('Admin');
            $table->string('ipAddress')->nullable();
            $table->longText('metadata')->nullable();
            $table->timestamps();
        });

        // 32. cost_analyses
        Schema::create('cost_analyses', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('projectId')->nullable();
            $table->string('projectName');
            $table->string('location')->nullable();
            $table->string('date')->nullable();
            $table->double('siteAreaSqYards')->default(0);
            $table->double('outRateCostPerSqYard')->default(0);
            $table->double('outRateCostTotal')->default(0);
            $table->double('govtMarketValuePerSqYard')->default(0);
            $table->double('registrationPercentage')->default(7.5);
            $table->double('registrationCost')->default(0);
            $table->double('lrsVudaPercentage')->default(14);
            $table->double('lrsVudaCost')->default(0);
            $table->double('totalLandCost')->default(0);
            $table->double('gvmcPlanApprovalCost')->default(0);
            $table->double('tdrPercentage')->default(1);
            $table->double('tdrAreaSft')->default(0);
            $table->double('tdrTotalCost')->default(0);
            $table->double('totalTdrPlanCost')->default(0);
            $table->double('totalFlatsAreaSft')->default(0);
            $table->double('constructionCostPerSft')->default(0);
            $table->double('totalConstructionCost')->default(0);
            $table->double('ownerSharePercent')->default(40);
            $table->double('builderSharePercent')->default(60);
            $table->double('totalProjectCost')->default(0);
            $table->double('totalSaluableAreaSft')->default(0);
            $table->double('sellingPricePerSft')->default(0);
            $table->double('totalAreaSaluableCost')->default(0);
            $table->double('amenitiesCostPerUnit')->default(0);
            $table->integer('numberOfUnits')->default(0);
            $table->double('totalAmenitiesCost')->default(0);
            $table->double('totalSaleValue')->default(0);
            $table->double('costPerOneSft')->default(0);
            $table->double('netMarginTotal')->default(0);
            $table->double('landPurchaseCost')->default(0);
            $table->double('apcpdclElectricityCost')->default(0);
            $table->double('constructionCivilCost')->default(0);
            $table->double('borewellsCost')->default(0);
            $table->double('liftCost')->default(0);
            $table->double('transformerCost')->default(0);
            $table->double('waterSumpCost')->default(0);
            $table->double('generatorCost')->default(0);
            $table->double('intercomCost')->default(0);
            $table->double('cctvCost')->default(0);
            $table->double('solarCost')->default(0);
            $table->double('fireSafetyCost')->default(0);
            $table->double('architectCost')->default(0);
            $table->double('supervisionCost')->default(0);
            $table->double('securityCost')->default(0);
            $table->double('marketingExpense')->default(0);
            $table->double('legalRegistrationCost')->default(0);
            $table->double('contingencyCost')->default(0);
            $table->longText('customExpenses')->nullable();
            $table->double('totalOutflow')->default(0);
            $table->double('flatSalesEstimate')->default(0);
            $table->double('commercialSalesEstimate')->default(0);
            $table->longText('customInflows')->nullable();
            $table->double('totalInflow')->default(0);
            $table->double('netProfit')->default(0);
            $table->double('profitMarginPercent')->default(0);
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        // 33. daily_agenda_matrices
        Schema::create('daily_agenda_matrices', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('title');
            $table->longText('columns')->nullable();
            $table->longText('rows')->nullable();
            $table->longText('cellChecklists')->nullable();
            $table->longText('taskItems')->nullable();
            $table->timestamps();
        });

        // 34. project_inspections
        Schema::create('project_inspections', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('projectId');
            $table->string('projectName');
            $table->string('builderName')->nullable();
            $table->string('location')->nullable();
            $table->string('reraNo')->nullable();
            $table->string('checkedBy')->nullable();
            $table->string('inspectionDate')->nullable();
            $table->longText('stages')->nullable();
            $table->double('overallProgress')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('project_inspections');
        Schema::dropIfExists('daily_agenda_matrices');
        Schema::dropIfExists('cost_analyses');
        Schema::dropIfExists('accounting_activities');
        Schema::dropIfExists('payments_out');
        Schema::dropIfExists('payments_in');
        Schema::dropIfExists('loan_payments');
        Schema::dropIfExists('loans');
        Schema::dropIfExists('invoices');
        Schema::dropIfExists('quotations');
        Schema::dropIfExists('expenses');
        Schema::dropIfExists('expense_categories');
        Schema::dropIfExists('stock_movements');
        Schema::dropIfExists('inventory_items');
        Schema::dropIfExists('suppliers');
        Schema::dropIfExists('customers');
        Schema::dropIfExists('wallet_transactions');
        Schema::dropIfExists('wallets');
        Schema::dropIfExists('site_visits');
        Schema::dropIfExists('documents');
        Schema::dropIfExists('job_applications');
        Schema::dropIfExists('enquiries');
        Schema::dropIfExists('gallery_items');
        Schema::dropIfExists('blogs');
        Schema::dropIfExists('projects');
        Schema::dropIfExists('marketing_agents');
        Schema::dropIfExists('amenities');
        Schema::dropIfExists('facings');
        Schema::dropIfExists('property_types');
        Schema::dropIfExists('location_masters');
        Schema::dropIfExists('cities');
        Schema::dropIfExists('mail_configs');
        Schema::dropIfExists('audit_logs');
        Schema::dropIfExists('user_session_logs');
    }
};
