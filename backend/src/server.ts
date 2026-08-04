import "reflect-metadata";
import express from "express";
import cors from "cors";
import * as dotenv from "dotenv";
import path from "path";
import fs from "fs";
import sequelize from "./config/database";

// Import new route files
import authRoutes from "./routes/auth";
import projectsRoutes from "./routes/projects";
import blogsRoutes from "./routes/blogs";
import galleryRoutes from "./routes/gallery";
import enquiriesRoutes from "./routes/enquiries";
import mastersRoutes from "./routes/masters";
import careersRoutes from "./routes/careers";
import usersRoutes from "./routes/users";
import uploadRoutes from "./routes/upload";
import documentsRoutes from "./routes/documents";
import siteVisitsRoutes, { runAutomatedSiteVisitReminders } from "./routes/siteVisits";
import mailConfigRoutes from "./routes/mailConfig";
import marketingAgentsRoutes from "./routes/marketingAgents";
import expensesRoutes from "./routes/expenses";
import expenseCategoriesRoutes from "./routes/expenseCategories";
import auditLogsRoutes from "./routes/auditLogs";



// Import new JkFutureinfra accounting route files
import walletsRoutes from "./routes/wallets";
import quotationsRoutes from "./routes/quotations";
import inventoryRoutes from "./routes/inventory";
import loansRoutes from "./routes/loans";
import customersRoutes from "./routes/customers";
import suppliersRoutes from "./routes/suppliers";
import invoicesRoutes from "./routes/invoices";
import paymentsRoutes from "./routes/payments";

// Import seeder
import { seedDatabase } from "./utils/seeder";

const app = express();
app.set("trust proxy", true);

const defaultAllowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  "http://localhost:5000",
  "https://jkfutureinfra.com",
  "https://www.jkfutureinfra.com",
  "http://jkfutureinfra.com",
  "http://www.jkfutureinfra.com"
];

const envAllowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map(o => o.trim())
  : [];

const allowedOrigins = [...new Set([...defaultAllowedOrigins, ...envAllowedOrigins])];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, server-to-server)
    if (!origin) return callback(null, true);
    
    const isAllowed = allowedOrigins.includes("*") || 
                      allowedOrigins.includes(origin) ||
                      origin.endsWith("jkfutureinfra.com");
    
    if (isAllowed) {
      callback(null, true);
    } else {
      console.warn(`⚠️ CORS blocked request from unknown origin: ${origin}`);
      callback(new Error(`CORS policy blocked request from origin: ${origin}`));
    }
  },
  credentials: true
}));
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    console.log(`[HTTP] ${req.method} ${req.originalUrl} - Status: ${res.statusCode} - Time: ${duration}ms`);
  });
  next();
});
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));


console.log("🛠️ Loading JK Future Infra Routes...");

// Wire up routes
app.use("/api/auth", authRoutes);
app.use("/api/projects", projectsRoutes);
app.use("/api/blogs", blogsRoutes);
app.use("/api/gallery", galleryRoutes);
app.use("/api/enquiries", enquiriesRoutes);
app.use("/api/masters", mastersRoutes);
app.use("/api/careers", careersRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/documents", documentsRoutes);
app.use("/api/site-visits", siteVisitsRoutes);
app.use("/api/mail-config", mailConfigRoutes);
app.use("/api/marketing-agents", marketingAgentsRoutes);
app.use("/api/expenses", expensesRoutes);
app.use("/api/expense-categories", expenseCategoriesRoutes);
app.use("/api/audit-logs", auditLogsRoutes);

// Mount new JkFutureinfra accounting routes
app.use("/api/wallets", walletsRoutes);
app.use("/api/quotations", quotationsRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/loans", loansRoutes);
app.use("/api/customers", customersRoutes);
app.use("/api/suppliers", suppliersRoutes);
app.use("/api/invoices", invoicesRoutes);
app.use("/api/payments", paymentsRoutes);

// Root & Health Check routes for Dokploy / Load Balancers
app.get("/", (req, res) => {
  res.json({
    status: "ok",
    message: "JK Future Infra API Server is running",
    timestamp: new Date().toISOString()
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString()
  });
});

// Global Error Handling Middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("🔥 Error caught by server middleware:", err);
  const status = err.status || 500;
  const message = err.message || "Internal Server Error";

  res.status(status).json({
    success: false,
    message,
    errors: err.errors || null
  });
});

const PORT = process.env.PORT || 5000;

// ─── Ensure all upload subfolders exist (never deletes existing) ────────────
const UPLOAD_SUBFOLDERS = [
  "properties",
  "marketing",
  "marketing_visual_assets",
  "project_visual_assets",
  "blogs",
  "others"
];
const uploadsRoot = path.join(__dirname, "../uploads");
UPLOAD_SUBFOLDERS.forEach((folder) => {
  const folderPath = path.join(uploadsRoot, folder);
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
    console.log(`📁 Created upload folder: uploads/${folder}`);
  } else {
    console.log(`✅ Upload folder exists: uploads/${folder}`);
  }
});

// Initialize Database & Start Express Server
const isProduction = process.env.NODE_ENV === "production";
sequelize.sync({ alter: !isProduction })
  .then(async () => {
    console.log(`🔥 Sequelize Database Connected & Synced (${isProduction ? 'Standard Mode' : 'Alter Mode'})!`);

    // Alter existing table columns to TEXT to prevent VARCHAR(255) length errors
    try {
      await sequelize.query(`
        ALTER TABLE "projects" ALTER COLUMN "specImage" TYPE TEXT;
        ALTER TABLE "projects" ALTER COLUMN "brochureUrl" TYPE TEXT;
        ALTER TABLE "projects" ALTER COLUMN "location" TYPE TEXT;
        ALTER TABLE "projects" ALTER COLUMN "microLocation" TYPE TEXT;
        ALTER TABLE "projects" ALTER COLUMN "city" TYPE TEXT;
        ALTER TABLE "projects" ALTER COLUMN "availabilityDetails" TYPE TEXT;
        ALTER TABLE "projects" ALTER COLUMN "marketingResult" TYPE TEXT;
        ALTER TABLE "projects" ALTER COLUMN "name" TYPE TEXT;
        ALTER TABLE "projects" ALTER COLUMN "category" TYPE TEXT;
        ALTER TABLE "projects" ALTER COLUMN "subCategory" TYPE TEXT;
        ALTER TABLE "gallery_items" ALTER COLUMN "url" TYPE TEXT;
        ALTER TABLE "gallery_items" ALTER COLUMN "thumbnail" TYPE TEXT;
        ALTER TABLE "documents" ALTER COLUMN "fileUrl" TYPE TEXT;
      `);
      console.log("✅ Database column types updated to TEXT successfully.");
    } catch (migErr: any) {
      console.log("ℹ️ Column migration info:", migErr?.message || migErr);
    }

    // Run the data seeder
    await seedDatabase();

    app.listen(PORT, () => {
      console.log(`🚀 Server running at http://localhost:${PORT}`);
      
      // Start background task timer (every 10 minutes) for site visit reminders
      const TEN_MINUTES = 10 * 60 * 1000;
      setInterval(async () => {
        try {
          await runAutomatedSiteVisitReminders();
        } catch (err) {
          console.error("Failed to run automated background reminders interval:", err);
        }
      }, TEN_MINUTES);

      // Also run reminders once immediately on server start to catch up
      setTimeout(async () => {
        try {
          await runAutomatedSiteVisitReminders();
        } catch (err) {
          console.error("Failed to run immediate automated reminders on startup:", err);
        }
      }, 5000); // Wait 5 seconds after startup to ensure everything is stable
    });
  })
  .catch((err) => {
    console.error("❌ Error during Database synchronization or startup:", err);
  });
