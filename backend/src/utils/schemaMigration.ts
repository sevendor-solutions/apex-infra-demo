import sequelize from "../config/database";

interface ColumnDef {
    name: string;
    pgType: string;
    sqliteType: string;
    defaultValue?: string;
}

const TABLE_MIGRATIONS: Record<string, ColumnDef[]> = {
    invoices: [
        { name: "quotationId", pgType: "VARCHAR(255)", sqliteType: "TEXT" },
        { name: "quotationNumber", pgType: "VARCHAR(255)", sqliteType: "TEXT" },
        { name: "customerMobile", pgType: "VARCHAR(255)", sqliteType: "TEXT" },
        { name: "customerAddress", pgType: "TEXT", sqliteType: "TEXT" },
        { name: "projectName", pgType: "VARCHAR(255)", sqliteType: "TEXT" },
        { name: "amenityItems", pgType: "TEXT", sqliteType: "TEXT" },
        { name: "notes", pgType: "TEXT", sqliteType: "TEXT" },
        { name: "termsAndConditions", pgType: "TEXT", sqliteType: "TEXT" },
        { name: "paidAmount", pgType: "DOUBLE PRECISION", sqliteType: "REAL", defaultValue: "0" },
        { name: "pendingAmount", pgType: "DOUBLE PRECISION", sqliteType: "REAL", defaultValue: "0" },
        { name: "paymentStatus", pgType: "VARCHAR(255)", sqliteType: "TEXT", defaultValue: "'Unpaid'" },
        { name: "userId", pgType: "VARCHAR(255)", sqliteType: "TEXT" }
    ],
    quotations: [
        { name: "customerMobile", pgType: "VARCHAR(255)", sqliteType: "TEXT" },
        { name: "customerAddress", pgType: "TEXT", sqliteType: "TEXT" },
        { name: "projectName", pgType: "VARCHAR(255)", sqliteType: "TEXT" },
        { name: "amenityItems", pgType: "TEXT", sqliteType: "TEXT" },
        { name: "notes", pgType: "TEXT", sqliteType: "TEXT" },
        { name: "termsAndConditions", pgType: "TEXT", sqliteType: "TEXT" },
        { name: "status", pgType: "VARCHAR(255)", sqliteType: "TEXT", defaultValue: "'Draft'" },
        { name: "convertedInvoiceId", pgType: "VARCHAR(255)", sqliteType: "TEXT" },
        { name: "convertedInvoiceNumber", pgType: "VARCHAR(255)", sqliteType: "TEXT" },
        { name: "userId", pgType: "VARCHAR(255)", sqliteType: "TEXT" }
    ],
    payments_in: [
        { name: "invoiceNumber", pgType: "VARCHAR(255)", sqliteType: "TEXT" },
        { name: "accountName", pgType: "VARCHAR(255)", sqliteType: "TEXT" },
        { name: "referenceNumber", pgType: "VARCHAR(255)", sqliteType: "TEXT" },
        { name: "receiptNo", pgType: "VARCHAR(255)", sqliteType: "TEXT" },
        { name: "status", pgType: "VARCHAR(255)", sqliteType: "TEXT", defaultValue: "'Used'" },
        { name: "unusedAmount", pgType: "DOUBLE PRECISION", sqliteType: "REAL", defaultValue: "0" },
        { name: "linkedTxns", pgType: "TEXT", sqliteType: "TEXT" },
        { name: "attachmentUrl", pgType: "VARCHAR(255)", sqliteType: "TEXT" },
        { name: "notes", pgType: "TEXT", sqliteType: "TEXT" },
        { name: "userId", pgType: "VARCHAR(255)", sqliteType: "TEXT" }
    ],
    payments_out: [
        { name: "billNumber", pgType: "VARCHAR(255)", sqliteType: "TEXT" },
        { name: "accountName", pgType: "VARCHAR(255)", sqliteType: "TEXT" },
        { name: "referenceNumber", pgType: "VARCHAR(255)", sqliteType: "TEXT" },
        { name: "receiptNo", pgType: "VARCHAR(255)", sqliteType: "TEXT" },
        { name: "status", pgType: "VARCHAR(255)", sqliteType: "TEXT", defaultValue: "'Used'" },
        { name: "unusedAmount", pgType: "DOUBLE PRECISION", sqliteType: "REAL", defaultValue: "0" },
        { name: "linkedTxns", pgType: "TEXT", sqliteType: "TEXT" },
        { name: "attachmentUrl", pgType: "VARCHAR(255)", sqliteType: "TEXT" },
        { name: "notes", pgType: "TEXT", sqliteType: "TEXT" },
        { name: "userId", pgType: "VARCHAR(255)", sqliteType: "TEXT" }
    ],
    expenses: [
        { name: "expenseNo", pgType: "VARCHAR(255)", sqliteType: "TEXT" },
        { name: "billDate", pgType: "DATE", sqliteType: "TEXT" },
        { name: "stateOfSupply", pgType: "VARCHAR(255)", sqliteType: "TEXT" },
        { name: "paymentType", pgType: "VARCHAR(255)", sqliteType: "TEXT" },
        { name: "walletId", pgType: "VARCHAR(255)", sqliteType: "TEXT" },
        { name: "accountName", pgType: "VARCHAR(255)", sqliteType: "TEXT" },
        { name: "referenceNo", pgType: "VARCHAR(255)", sqliteType: "TEXT" },
        { name: "roundOff", pgType: "BOOLEAN", sqliteType: "INTEGER", defaultValue: "TRUE" },
        { name: "totalAmount", pgType: "DOUBLE PRECISION", sqliteType: "REAL", defaultValue: "0" },
        { name: "paidAmount", pgType: "DOUBLE PRECISION", sqliteType: "REAL", defaultValue: "0" },
        { name: "pendingAmount", pgType: "DOUBLE PRECISION", sqliteType: "REAL", defaultValue: "0" },
        { name: "paymentStatus", pgType: "VARCHAR(255)", sqliteType: "TEXT", defaultValue: "'Paid'" },
        { name: "notes", pgType: "TEXT", sqliteType: "TEXT" },
        { name: "userId", pgType: "VARCHAR(255)", sqliteType: "TEXT" },
        { name: "location", pgType: "VARCHAR(255)", sqliteType: "TEXT" },
        { name: "apartment", pgType: "VARCHAR(255)", sqliteType: "TEXT" },
        { name: "projectName", pgType: "VARCHAR(255)", sqliteType: "TEXT" }
    ],
    customers: [
        { name: "creditLimit", pgType: "DOUBLE PRECISION", sqliteType: "REAL", defaultValue: "0" },
        { name: "openingBalance", pgType: "DOUBLE PRECISION", sqliteType: "REAL", defaultValue: "0" },
        { name: "outstandingAmount", pgType: "DOUBLE PRECISION", sqliteType: "REAL", defaultValue: "0" },
        { name: "userId", pgType: "VARCHAR(255)", sqliteType: "TEXT" },
        { name: "email", pgType: "VARCHAR(255)", sqliteType: "TEXT" },
        { name: "address", pgType: "TEXT", sqliteType: "TEXT" },
        { name: "gstNumber", pgType: "VARCHAR(255)", sqliteType: "TEXT" }
    ],
    suppliers: [
        { name: "openingBalance", pgType: "DOUBLE PRECISION", sqliteType: "REAL", defaultValue: "0" },
        { name: "outstandingAmount", pgType: "DOUBLE PRECISION", sqliteType: "REAL", defaultValue: "0" },
        { name: "userId", pgType: "VARCHAR(255)", sqliteType: "TEXT" },
        { name: "address", pgType: "TEXT", sqliteType: "TEXT" },
        { name: "gstNumber", pgType: "VARCHAR(255)", sqliteType: "TEXT" }
    ],
    users: [
        { name: "agentId", pgType: "VARCHAR(255)", sqliteType: "TEXT" },
        { name: "allowedScreens", pgType: "TEXT", sqliteType: "TEXT", defaultValue: "'[]'" },
        { name: "isActive", pgType: "BOOLEAN", sqliteType: "INTEGER", defaultValue: "TRUE" }
    ]
};

let migrationRan = false;

export async function runSchemaMigrations(force = false): Promise<void> {
    if (migrationRan && !force) return;

    try {
        const dialect = sequelize.getDialect();
        console.log(`🔧 Running database schema migrations for dialect: ${dialect}...`);

        if (dialect === "postgres") {
            try {
                await sequelize.query(`
                    CREATE TABLE IF NOT EXISTS "accounting_activities" (
                        "id" VARCHAR(255) PRIMARY KEY,
                        "module" VARCHAR(255) NOT NULL,
                        "activityType" VARCHAR(50) NOT NULL,
                        "recordId" VARCHAR(255),
                        "description" TEXT NOT NULL,
                        "amount" DOUBLE PRECISION DEFAULT 0,
                        "userName" VARCHAR(255) NOT NULL,
                        "userRole" VARCHAR(255) NOT NULL DEFAULT 'Admin',
                        "userId" VARCHAR(255),
                        "ipAddress" VARCHAR(255),
                        "dateTime" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        "metadata" TEXT,
                        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
                    );
                `);
            } catch {
                // Table might already exist
            }

            for (const [table, columns] of Object.entries(TABLE_MIGRATIONS)) {
                for (const col of columns) {
                    const defaultClause = col.defaultValue !== undefined ? ` DEFAULT ${col.defaultValue}` : "";
                    const query = `ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "${col.name}" ${col.pgType}${defaultClause};`;
                    try {
                        await sequelize.query(query);
                    } catch (colErr: any) {
                        // Suppress individual column error if table doesn't exist yet or already altered
                    }
                }
            }

            // Also ensure TEXT column alterations for large texts
            const textAlterations = [
                'ALTER TABLE "projects" ALTER COLUMN "specImage" TYPE TEXT;',
                'ALTER TABLE "projects" ALTER COLUMN "brochureUrl" TYPE TEXT;',
                'ALTER TABLE "projects" ALTER COLUMN "location" TYPE TEXT;',
                'ALTER TABLE "projects" ALTER COLUMN "microLocation" TYPE TEXT;',
                'ALTER TABLE "projects" ALTER COLUMN "city" TYPE TEXT;',
                'ALTER TABLE "projects" ALTER COLUMN "availabilityDetails" TYPE TEXT;',
                'ALTER TABLE "projects" ALTER COLUMN "marketingResult" TYPE TEXT;',
                'ALTER TABLE "projects" ALTER COLUMN "name" TYPE TEXT;',
                'ALTER TABLE "projects" ALTER COLUMN "category" TYPE TEXT;',
                'ALTER TABLE "projects" ALTER COLUMN "subCategory" TYPE TEXT;',
                'ALTER TABLE "gallery_items" ALTER COLUMN "url" TYPE TEXT;',
                'ALTER TABLE "gallery_items" ALTER COLUMN "thumbnail" TYPE TEXT;',
                'ALTER TABLE "documents" ALTER COLUMN "fileUrl" TYPE TEXT;'
            ];

            for (const query of textAlterations) {
                try {
                    await sequelize.query(query);
                } catch {
                    // Ignore if already text
                }
            }
        } else if (dialect === "sqlite") {
            try {
                await sequelize.query(`
                    CREATE TABLE IF NOT EXISTS "accounting_activities" (
                        "id" TEXT PRIMARY KEY,
                        "module" TEXT NOT NULL,
                        "activityType" TEXT NOT NULL,
                        "recordId" TEXT,
                        "description" TEXT NOT NULL,
                        "amount" REAL DEFAULT 0,
                        "userName" TEXT NOT NULL,
                        "userRole" TEXT NOT NULL DEFAULT 'Admin',
                        "userId" TEXT,
                        "ipAddress" TEXT,
                        "dateTime" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        "metadata" TEXT,
                        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                    );
                `);
            } catch {
                // Ignore
            }

            for (const [table, columns] of Object.entries(TABLE_MIGRATIONS)) {
                try {
                    const [results] = await sequelize.query(`PRAGMA table_info("${table}");`);
                    const existingCols = new Set((results as any[]).map((r) => r.name));

                    for (const col of columns) {
                        if (!existingCols.has(col.name)) {
                            const defaultClause = col.defaultValue !== undefined ? ` DEFAULT ${col.defaultValue}` : "";
                            await sequelize.query(
                                `ALTER TABLE "${table}" ADD COLUMN "${col.name}" ${col.sqliteType}${defaultClause};`
                            );
                        }
                    }
                } catch (tErr) {
                    // Table might not exist yet
                }
            }
        }

        migrationRan = true;
        console.log("✅ Database schema migrations completed successfully!");
    } catch (err) {
        console.error("⚠️ Schema migration notice:", err);
    }
}
