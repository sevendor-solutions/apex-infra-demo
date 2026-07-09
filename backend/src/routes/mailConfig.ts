import { Router } from "express";
import { MailConfig } from "../models/MailConfig";
import { authenticateToken } from "../middleware/auth";
import nodemailer from "nodemailer";
import fs from "fs";
import path from "path";
import { logAuditAction } from "../utils/auditLogger";

const router = Router();

// Helper to write environment variable updates to the local .env file
const updateEnvFile = (updates: Record<string, string>) => {
    try {
        const envPath = path.resolve(__dirname, "../../.env");
        if (!fs.existsSync(envPath)) {
            console.log(`⚠️ Env file not found at ${envPath}`);
            return;
        }
        let content = fs.readFileSync(envPath, "utf-8");
        for (const [key, value] of Object.entries(updates)) {
            if (value === undefined || value === null) continue;
            const regex = new RegExp(`^${key}=.*$`, "m");
            if (regex.test(content)) {
                content = content.replace(regex, `${key}=${value}`);
            } else {
                content += `\n${key}=${value}`;
            }
        }
        fs.writeFileSync(envPath, content, "utf-8");
        console.log(`... Successfully updated .env file at ${envPath}`);
    } catch (err) {
        console.error("❌ Failed to update .env file:", err);
    }
};

// GET mail config (finds or creates default)
router.get("/", authenticateToken, async (req, res, next) => {
    try {
        let config = await MailConfig.findByPk("default");
        if (!config) {
            config = await MailConfig.create({
                id: "default",
                deliveryMode: "simulation",
                triggerWindowDays: 5,
                sendBeforeDays: 1,
                smtpHost: "smtp.mailtrap.io",
                smtpPort: 2525,
                smtpUser: "",
                smtpPass: "",
                senderEmail: "noreply@jkfutureinfra.com",
                summaryEmail: "jkfutureinfra@gmail.com",
                emailSubject: "Reminder: Scheduled Site Visit for {projectName}",
                emailTemplate: "Hello {customerName},\n\nThis is a friendly reminder that you have a scheduled site visit for {projectName} on {visitDate} at {visitTime}.\n\nLocation: {location}\n\nOur property consultant {assignedAgent} (Phone: {assignedAgentPhone}) will guide you.\n\nWarm regards,\nJK Future Infra Team",
                smsProvider: "",
                smsApiKey: "",
                smsSenderId: "",
                smsEnabled: false,
                whatsappToken: "",
                whatsappPhoneId: "",
                whatsappEnabled: false,
                dbType: process.env.DB_TYPE || "postgres",
                dbHost: process.env.PG_HOST || "localhost",
                dbPort: parseInt(process.env.PG_PORT || "5432"),
                dbUser: process.env.PG_USER || "postgres",
                dbPassword: process.env.PG_PASSWORD || "Admin@123",
                dbName: process.env.PG_DB || "JKFutureDB",
                jwtSecret: process.env.JWT_SECRET || "jk_future_infra_secret_jwt_key_2026"
            });
        } else {
            // Dynamically populate default settings cache from .env if they are empty
            let updated = false;
            if (!config.dbType) {
                config.dbType = process.env.DB_TYPE || "postgres";
                updated = true;
            }
            const dbTypeLower = config.dbType.toLowerCase();
            if (!config.dbHost) {
                if (dbTypeLower === "postgres") config.dbHost = process.env.PG_HOST || "localhost";
                else if (dbTypeLower === "mysql" || dbTypeLower === "mariadb") config.dbHost = process.env.MYSQL_HOST || "localhost";
                else if (dbTypeLower === "mssql") config.dbHost = process.env.DB_HOST || "localhost";
                updated = true;
            }
            if (!config.dbPort) {
                if (dbTypeLower === "postgres") config.dbPort = parseInt(process.env.PG_PORT || "5432");
                else if (dbTypeLower === "mysql" || dbTypeLower === "mariadb") config.dbPort = parseInt(process.env.MYSQL_PORT || "3306");
                else if (dbTypeLower === "mssql") config.dbPort = parseInt(process.env.DB_PORT || "1433");
                updated = true;
            }
            if (!config.dbUser) {
                if (dbTypeLower === "postgres") config.dbUser = process.env.PG_USER || "postgres";
                else if (dbTypeLower === "mysql" || dbTypeLower === "mariadb") config.dbUser = process.env.MYSQL_USER || "root";
                else if (dbTypeLower === "mssql") config.dbUser = process.env.DB_USER || "sa";
                updated = true;
            }
            if (!config.dbPassword) {
                if (dbTypeLower === "postgres") config.dbPassword = process.env.PG_PASSWORD || "Admin@123";
                else if (dbTypeLower === "mysql" || dbTypeLower === "mariadb") config.dbPassword = process.env.MYSQL_PASSWORD || "";
                else if (dbTypeLower === "mssql") config.dbPassword = process.env.DB_PASSWORD || "";
                updated = true;
            }
            if (!config.dbName) {
                if (dbTypeLower === "postgres") config.dbName = process.env.PG_DB || "JKFutureDB";
                else if (dbTypeLower === "mysql" || dbTypeLower === "mariadb") config.dbName = process.env.MYSQL_DB || "testdb";
                else if (dbTypeLower === "mssql") config.dbName = process.env.DB_NAME || "HRMS_DEV";
                updated = true;
            }
            if (!config.jwtSecret) {
                config.jwtSecret = process.env.JWT_SECRET || "jk_future_infra_secret_jwt_key_2026";
                updated = true;
            }

            if (updated) {
                await config.save();
            }
        }
        return res.json({ success: true, data: config });
    } catch (error) {
        next(error);
    }
});

// PUT update mail config and rewrite environment variables to .env
router.put("/", authenticateToken, async (req, res, next) => {
    try {
        let config = await MailConfig.findByPk("default");
        if (!config) {
            config = await MailConfig.create({ id: "default", ...req.body });
        } else {
            await config.update(req.body);
        }

        // Handle syncing system DB & JWT settings directly to server's .env file
        const envUpdates: Record<string, string> = {};
        if (req.body.dbType) {
            envUpdates["DB_TYPE"] = req.body.dbType;
            const dbTypeLower = req.body.dbType.toLowerCase();
            if (dbTypeLower === "postgres") {
                if (req.body.dbHost !== undefined) envUpdates["PG_HOST"] = req.body.dbHost;
                if (req.body.dbPort !== undefined) envUpdates["PG_PORT"] = String(req.body.dbPort);
                if (req.body.dbUser !== undefined) envUpdates["PG_USER"] = req.body.dbUser;
                if (req.body.dbPassword !== undefined) envUpdates["PG_PASSWORD"] = req.body.dbPassword;
                if (req.body.dbName !== undefined) envUpdates["PG_DB"] = req.body.dbName;
            } else if (dbTypeLower === "mysql" || dbTypeLower === "mariadb") {
                if (req.body.dbHost !== undefined) envUpdates["MYSQL_HOST"] = req.body.dbHost;
                if (req.body.dbPort !== undefined) envUpdates["MYSQL_PORT"] = String(req.body.dbPort);
                if (req.body.dbUser !== undefined) envUpdates["MYSQL_USER"] = req.body.dbUser;
                if (req.body.dbPassword !== undefined) envUpdates["MYSQL_PASSWORD"] = req.body.dbPassword;
                if (req.body.dbName !== undefined) envUpdates["MYSQL_DB"] = req.body.dbName;
            } else if (dbTypeLower === "mssql") {
                if (req.body.dbHost !== undefined) envUpdates["DB_HOST"] = req.body.dbHost;
                if (req.body.dbPort !== undefined) envUpdates["DB_PORT"] = String(req.body.dbPort);
                if (req.body.dbUser !== undefined) envUpdates["DB_USER"] = req.body.dbUser;
                if (req.body.dbPassword !== undefined) envUpdates["DB_PASSWORD"] = req.body.dbPassword;
                if (req.body.dbName !== undefined) envUpdates["DB_NAME"] = req.body.dbName;
            }
        }
        if (req.body.jwtSecret !== undefined) {
            envUpdates["JWT_SECRET"] = req.body.jwtSecret;
        }

        if (Object.keys(envUpdates).length > 0) {
            updateEnvFile(envUpdates);
        }

        await logAuditAction(req, "Mail Settings Updated", "Updated global SMTP settings and database configurations", "Success");
        return res.json({ success: true, data: config });
    } catch (error) {
        next(error);
    }
});

// POST send test email
router.post("/test", authenticateToken, async (req, res, next) => {
    const { toEmail } = req.body;
    if (!toEmail) {
        return res.status(400).json({ success: false, message: "Recipient email is required" });
    }

    try {
        const config = await MailConfig.findByPk("default");
        if (!config) {
            return res.status(404).json({ success: false, message: "Mail configuration not found" });
        }

        const subject = "JK Future Infra - SMTP Test Email";
        const body = `SMTP configurations are working perfectly!\n\nDetails:\nHost: ${config.smtpHost}\nPort: ${config.smtpPort}\nSender: ${config.senderEmail}\nMode: ${config.deliveryMode}`;

        if (config.deliveryMode === "simulation") {
            console.log("=========================================");
            console.log(`✉️ MOCK TEST EMAIL SENT (SIMULATION MODE)`);
            console.log(`To: ${toEmail}`);
            console.log(`Subject: ${subject}`);
            console.log(`Body:\n${body}`);
            console.log("=========================================");
            
            await logAuditAction(req, "SMTP Test Simulated", `Simulated sending test SMTP email to "${toEmail}"`, "Success");
            return res.json({ 
                success: true, 
                message: "Test email simulated successfully. Check server logs." 
            });
        }

        // SMTP mode — port 465=SSL, port 587=STARTTLS
        const transporter = nodemailer.createTransport({
            host: config.smtpHost,
            port: config.smtpPort,
            secure: config.smtpPort === 465,   // true only for port 465 (SSL); 587 uses STARTTLS
            auth: config.smtpUser ? {
                user: config.smtpUser,
                pass: config.smtpPass
            } : undefined,
            tls: {
                rejectUnauthorized: false       // accept self-signed / GoDaddy intermediate certs
            },
            connectionTimeout: 10000,
            greetingTimeout: 10000,
            socketTimeout: 15000
        });

        await transporter.sendMail({
            from: `"JK Future Infra" <${config.senderEmail}>`,
            to: toEmail,
            subject: subject,
            text: body
        });

        await logAuditAction(req, "SMTP Test Dispatched", `Successfully sent test SMTP email to "${toEmail}" via host: ${config.smtpHost}`, "Success");
        return res.json({ success: true, message: `Test email sent successfully to ${toEmail}!` });
    } catch (error: any) {
        console.error("SMTP Test failed:", error);
        await logAuditAction(req, "SMTP Test Failure", `Failed to send SMTP test email to "${toEmail}": ${error.message || error}`, "Failed");
        return res.status(500).json({ 
            success: false, 
            message: `SMTP Connection test failed: ${error.message || error}` 
        });
    }
});

export default router;
