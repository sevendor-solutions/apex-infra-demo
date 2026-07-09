import { Router } from "express";
import { User } from "../models/User";
import { UserSessionLog } from "../models/UserSessionLog";
import { MailConfig } from "../models/MailConfig";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import crypto from "crypto";
import { logAuditAction } from "../utils/auditLogger";

const router = Router();

// In-memory OTP store: { email -> { otp, expiresAt } }
const otpStore = new Map<string, { otp: string; expiresAt: number; userId: string }>();

// GET /user-email/:username — fetch registered email for username
router.get("/user-email/:username", async (req, res, next) => {
    try {
        const { username } = req.params;
        if (!username) return res.status(400).json({ success: false, message: "Username is required." });

        const user = await User.findOne({
            where: { username: username.trim().toLowerCase() }
        });
        if (!user) {
            return res.status(404).json({ success: false, message: "Username not found in system." });
        }
        if (!user.email) {
            return res.status(400).json({ success: false, message: "This account has no registered email. Please contact the administrator." });
        }
        return res.json({ success: true, email: user.email });
    } catch (error) {
        next(error);
    }
});


function getDeviceType(userAgent: string | null): string {
    if (!userAgent) return "Unknown";
    const ua = userAgent.toLowerCase();
    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
        return "Tablet";
    }
    if (/Mobile|iP(hone|od)|Android|BlackBerry|IEMobile|Kindle|NetFront|Silk-Accelerated|(hpw|web)OS|Fennec|Minimo|Opera M(obi|ini)|Blazer|Dolfin|Dolphin|Skyfire|Zune/i.test(ua)) {
        return "Mobile";
    }
    return "Desktop";
}

// Staff Login
router.post("/login", async (req, res, next) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ success: false, message: "Username and password are required" });
        }

        const user = await User.findOne({
            where: { username }
        });

        if (!user) {
            const fakeReq = { ip: req.ip, headers: req.headers, socket: req.socket, user: undefined } as any;
            await logAuditAction(fakeReq, "User Login Attempt", `Failed login attempt for non-existent username: "${username}"`, "Failed", { username, role: "Guest" });
            return res.status(401).json({ success: false, message: "Invalid username or staff credential." });
        }

        // Compare password encoded in Base64
        const inputPasswordBase64 = Buffer.from(password).toString("base64");
        let isValid = false;

        if (user.password === inputPasswordBase64) {
            isValid = true;
        } else if (user.password === password) {
            // Fallback for plain text passwords in the database (automatic migration)
            isValid = true;
            try {
                user.password = password; // Trigger setter to convert to Base64
                await user.save();
                console.log(`🔑 Automatically migrated password for ${user.username} to Base64.`);
            } catch (migrationError) {
                console.error(`Failed to migrate password to Base64 for ${user.username}:`, migrationError);
            }
        }

        if (!isValid) {
            const fakeReq = { ip: req.ip, headers: req.headers, socket: req.socket, user: undefined } as any;
            await logAuditAction(fakeReq, "User Login Attempt", `Failed login attempt (incorrect password) for username: "${username}"`, "Failed", { username, role: user.role });
            return res.status(401).json({ success: false, message: "Incorrect password entered." });
        }

        // Track LOGIN event in UserSessionLog
        try {
            await UserSessionLog.create({
                userId: user.id,
                username: user.username,
                action: "LOGIN",
                ipAddress: req.ip || (req.headers["x-forwarded-for"] as string) || null,
                userAgent: req.headers["user-agent"] || null,
                device: getDeviceType(req.headers["user-agent"] || null)
            });
        } catch (trackError) {
            console.error("Failed to log user login session:", trackError);
        }

        // Log successful login in System Audit Logs
        const fakeReq = { ip: req.ip, headers: req.headers, socket: req.socket, user: undefined } as any;
        await logAuditAction(fakeReq, "User Login", `User "${user.username}" logged in successfully`, "Success", { username: user.username, role: user.role });

        const userResponse = user.toJSON();
        delete userResponse.password;

        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role },
            process.env.JWT_SECRET || "jk_future_infra_secret_jwt_key_2026",
            { expiresIn: "1d" }
        );

        return res.json({
            success: true,
            user: userResponse,
            token
        });
    } catch (error) {
        next(error);
    }
});

// Staff Logout
router.post("/logout", async (req, res, next) => {
    try {
        const { username } = req.body;
        if (!username) {
            return res.status(400).json({ success: false, message: "Username is required" });
        }

        const user = await User.findOne({
            where: { username }
        });

        if (user) {
            // Track LOGOUT event in UserSessionLog
            try {
                await UserSessionLog.create({
                    userId: user.id,
                    username: user.username,
                    action: "LOGOUT",
                    ipAddress: req.ip || (req.headers["x-forwarded-for"] as string) || null,
                    userAgent: req.headers["user-agent"] || null,
                    device: getDeviceType(req.headers["user-agent"] || null)
                });
            } catch (trackError) {
                console.error("Failed to log user logout session:", trackError);
            }

            // Log logout in System Audit Logs
            const fakeReq = { ip: req.ip, headers: req.headers, socket: req.socket, user: undefined } as any;
            await logAuditAction(fakeReq, "User Logout", `User "${user.username}" logged out`, "Success", { username: user.username, role: user.role });
        }

        return res.json({
            success: true,
            message: "Logout tracked successfully"
        });
    } catch (error) {
        next(error);
    }
});


// POST /forgot-password — generate & email OTP
router.post("/forgot-password", async (req, res, next) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ success: false, message: "Email address is required." });

        // Find user by email
        const user = await User.findOne({ where: { email } });
        if (!user) {
            // Return success anyway to avoid user enumeration
            return res.json({ success: true, message: "If this email is registered, an OTP has been sent." });
        }

        // Generate 6-digit OTP
        const otp = crypto.randomInt(100000, 999999).toString();
        const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes
        otpStore.set(email.toLowerCase(), { otp, expiresAt, userId: user.id });

        // Get mail config
        const mailConfig = await MailConfig.findByPk("default");
        const smtpHost = mailConfig?.smtpHost || "smtpout.secureserver.net";
        const smtpPort = mailConfig?.smtpPort || 587;
        const smtpUser = mailConfig?.smtpUser || "";
        const smtpPass = mailConfig?.smtpPass || "";
        const senderEmail = mailConfig?.senderEmail || "info@sevendorsolutions.com";
        const deliveryMode = mailConfig?.deliveryMode || "simulation";

        if (deliveryMode === "simulation") {
            console.log("=========================================");
            console.log(`🔐 OTP FOR PASSWORD RESET (SIMULATION MODE)`);
            console.log(`To: ${email}`);
            console.log(`OTP: ${otp}`);
            console.log(`Expires: ${new Date(expiresAt).toISOString()}`);
            console.log("=========================================");
            
            const fakeReq = { ip: req.ip, headers: req.headers, socket: req.socket } as any;
            await logAuditAction(fakeReq, "OTP Email Simulated", `Simulated verification OTP password reset email to "${email}"`, "Success", { username: user.username, role: user.role });
        } else {
            const transporter = nodemailer.createTransport({
                host: smtpHost,
                port: smtpPort,
                secure: smtpPort === 465,
                auth: smtpUser ? { user: smtpUser, pass: smtpPass } : undefined,
                tls: { rejectUnauthorized: false },
                connectionTimeout: 10000,
                greetingTimeout: 10000
            });
            await transporter.sendMail({
                from: `"JK Future Infra" <${senderEmail}>`,
                to: email,
                subject: "JK Future Infra — Password Reset OTP",
                html: `
                    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;border:1px solid #e2e8f0;border-radius:8px;">
                        <h2 style="color:#0f2b46;margin-bottom:8px;">Password Reset Request</h2>
                        <p style="color:#475569;margin-bottom:24px;">We received a request to reset the password for your JK Future Infra admin account.</p>
                        <div style="background:#f1f5f9;border-radius:8px;padding:24px;text-align:center;margin-bottom:24px;">
                            <p style="margin:0 0 8px;font-size:13px;color:#64748b;text-transform:uppercase;letter-spacing:1px;">Your One-Time Password</p>
                            <h1 style="margin:0;font-size:42px;letter-spacing:12px;color:#0f2b46;font-family:monospace;">${otp}</h1>
                        </div>
                        <p style="color:#94a3b8;font-size:13px;">This OTP expires in <strong>10 minutes</strong>. If you did not request a password reset, please ignore this email.</p>
                    </div>
                `
            });
            
            const fakeReq = { ip: req.ip, headers: req.headers, socket: req.socket } as any;
            await logAuditAction(fakeReq, "OTP Email Dispatch", `Dispatched verification OTP password reset email to "${email}"`, "Success", { username: user.username, role: user.role });
        }

        return res.json({ success: true, message: "OTP sent to registered email." });
    } catch (error) {
        next(error);
    }
});

// POST /verify-otp — verify the OTP is valid and not expired
router.post("/verify-otp", async (req, res) => {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ success: false, message: "Email and OTP are required." });

    const record = otpStore.get(email.toLowerCase());
    if (!record) return res.status(400).json({ success: false, message: "No OTP found. Please request a new one." });
    if (Date.now() > record.expiresAt) {
        otpStore.delete(email.toLowerCase());
        return res.status(400).json({ success: false, message: "OTP has expired. Please request a new one." });
    }
    if (record.otp !== otp.toString()) {
        return res.status(400).json({ success: false, message: "Incorrect OTP entered. Please try again." });
    }

    return res.json({ success: true, message: "OTP verified successfully." });
});

// POST /reset-password — set new password (requires valid OTP already verified)
router.post("/reset-password", async (req, res, next) => {
    try {
        const { email, otp, newPassword } = req.body;
        if (!email || !otp || !newPassword) {
            return res.status(400).json({ success: false, message: "Email, OTP and new password are required." });
        }

        const record = otpStore.get(email.toLowerCase());
        if (!record) return res.status(400).json({ success: false, message: "OTP session expired. Please start again." });
        if (Date.now() > record.expiresAt) {
            otpStore.delete(email.toLowerCase());
            return res.status(400).json({ success: false, message: "OTP has expired. Please start again." });
        }
        if (record.otp !== otp.toString()) {
            return res.status(400).json({ success: false, message: "Invalid OTP." });
        }

        const user = await User.findByPk(record.userId);
        if (!user) return res.status(404).json({ success: false, message: "User not found." });

        // The model setter automatically handles the Base64 encoding
        user.password = newPassword;
        await user.save();

        // Clear OTP after successful use
        otpStore.delete(email.toLowerCase());

        console.log(`🔑 Password reset successfully for user: ${user.username}`);
        return res.json({ success: true, message: "Password has been reset successfully. You can now log in." });
    } catch (error) {
        next(error);
    }
});

export default router;
