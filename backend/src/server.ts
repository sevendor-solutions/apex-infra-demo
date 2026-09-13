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
import accountingActivitiesRoutes from "./routes/accountingActivities";

// Import Cost Analysis & Follow-up Matrix routes
import costAnalysesRoutes from "./routes/costAnalyses";
import dailyAgendaRoutes from "./routes/dailyAgenda";
import projectInspectionsRoutes from "./routes/projectInspections";

// Import seeder & migrations
import { seedDatabase } from "./utils/seeder";
import { runSchemaMigrations } from "./utils/schemaMigration";
import { globalAuditMiddleware } from "./middleware/globalAuditMiddleware";

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
app.use(globalAuditMiddleware);
app.use("/uploads", (req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
  res.header("Access-Control-Allow-Headers", "*");
  res.header("Cross-Origin-Resource-Policy", "cross-origin");
  next();
}, express.static(path.join(__dirname, "../uploads")));


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
app.use("/api/accounting-activities", accountingActivitiesRoutes);

// Mount Cost Analysis & Follow-up Matrix routes
app.use("/api/cost-analyses", costAnalysesRoutes);
app.use("/api/daily-agenda", dailyAgendaRoutes);
app.use("/api/project-inspections", projectInspectionsRoutes);

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

// Initialize Database & Start Express Server (Fast Non-Blocking Startup)
const startServer = async () => {
  try {
    // 1. Authenticate DB connection quickly
    await sequelize.authenticate();
    console.log("🔥 Sequelize Database Connected successfully!");

    // 2. Fast Schema Sync (Standard Mode)
    await sequelize.sync();
    console.log("✅ Sequelize Database Models Synced!");

    // 2.5 Run Schema Column Migrations (ensures all added model columns exist on PostgreSQL)
    await runSchemaMigrations();

    // 3. Start Express HTTP server immediately
    app.listen(PORT, () => {
      console.log(`🚀 Server running at http://localhost:${PORT}`);
    });

    // 4. Run seeder and background intervals asynchronously without blocking server
    (async () => {
      try {
        await seedDatabase();
      } catch (seedErr: any) {
        console.warn("ℹ️ Seeder note:", seedErr?.message || seedErr);
      }

      // Background task timer (every 10 minutes) for site visit reminders
      const TEN_MINUTES = 10 * 60 * 1000;
      setInterval(async () => {
        try {
          await runAutomatedSiteVisitReminders();
        } catch (err) {
          console.error("Failed to run automated background reminders interval:", err);
        }
      }, TEN_MINUTES);

      // Also run reminders once after 5s
      setTimeout(async () => {
        try {
          await runAutomatedSiteVisitReminders();
        } catch (err) {
          console.error("Failed to run immediate automated reminders on startup:", err);
        }
      }, 5000);
    })();

  } catch (err) {
    console.error("❌ Error during Database connection or startup:", err);
  }
};

startServer();
