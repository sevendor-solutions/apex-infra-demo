import { Router } from "express";
import path from "path";
import { SiteVisit } from "../models/SiteVisit";
import { MailConfig } from "../models/MailConfig";
import { Project } from "../models/Project";
import { MarketingAgent } from "../models/MarketingAgent";
import { authenticateToken } from "../middleware/auth";
import nodemailer from "nodemailer";
import { logAuditAction } from "../utils/auditLogger";
import PDFDocument from "pdfkit";

const router = Router();

// GET all site visits
router.get("/", authenticateToken, async (req, res, next) => {
    try {
        const visits = await SiteVisit.findAll({
            order: [["visitDate", "ASC"], ["visitTime", "ASC"]]
        });
        return res.json({ success: true, data: visits });
    } catch (error) {
        next(error);
    }
});

// POST schedule new site visit
router.post("/", authenticateToken, async (req, res, next) => {
    try {
        const newVisit = await SiteVisit.create(req.body);
        await logAuditAction(req, "Site Visit Scheduled", `Scheduled site visit for client "${newVisit.customerName}" (Project: ${newVisit.projectName})`, "Success");
        return res.status(201).json({ success: true, data: newVisit });
    } catch (error) {
        next(error);
    }
});

// PUT update site visit details
router.put("/:id", authenticateToken, async (req, res, next) => {
    try {
        const visit = await SiteVisit.findByPk(req.params.id);
        if (!visit) {
            return res.status(404).json({ success: false, message: "Site visit not found" });
        }
        await visit.update(req.body);
        await logAuditAction(req, "Site Visit Updated", `Updated site visit details for client "${visit.customerName}"`, "Success");
        return res.json({ success: true, data: visit });
    } catch (error) {
        next(error);
    }
});

// DELETE delete/cancel site visit
router.delete("/:id", authenticateToken, async (req, res, next) => {
    try {
        const visit = await SiteVisit.findByPk(req.params.id);
        if (!visit) {
            return res.status(404).json({ success: false, message: "Site visit not found" });
        }
        const name = visit.customerName;
        const project = visit.projectName;
        await visit.destroy();
        await logAuditAction(req, "Site Visit Cancelled", `Cancelled scheduled site visit for client "${name}" (Project: ${project})`, "Success");
        return res.json({ success: true, message: "Site visit deleted successfully" });
    } catch (error) {
        next(error);
    }
});

// Helper to replace placeholders
const compileTemplate = (template: string, variables: Record<string, string>) => {
    let result = template;
    for (const key in variables) {
        result = result.replace(new RegExp(`{${key}}`, 'g'), variables[key]);
    }
    return result;
};

const generateScheduledVisitsPdf = (
    dateStr: string,
    visits: any[]
): Promise<Buffer> => {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ margin: 40, size: "A4" });
            const chunks: Buffer[] = [];

            doc.on("data", (chunk) => chunks.push(chunk));
            doc.on("end", () => resolve(Buffer.concat(chunks)));
            doc.on("error", (err) => reject(err));

            // Header Banner
            doc.rect(0, 0, 595.28, 80).fill("#0f2b46");
            doc.fillColor("#ffffff")
               .fontSize(22)
               .font("Helvetica-Bold")
               .text("J.K. FUTURE INFRA", 40, 20);
            
            doc.fontSize(10)
               .font("Helvetica")
               .text(`DAILY SITE VISITS SCHEDULE REPORT`, 40, 48);

            doc.fontSize(10)
               .font("Helvetica-Bold")
               .text(`Date: ${dateStr}`, 480, 32, { align: "right" });

            doc.moveDown(4);

            // Table Header
            doc.fillColor("#334155");
            const tableTop = 110;
            doc.font("Helvetica-Bold").fontSize(10);
            doc.text("S.No", 40, tableTop);
            doc.text("Customer Details", 80, tableTop);
            doc.text("Property Site", 240, tableTop);
            doc.text("Time", 380, tableTop);
            doc.text("Assigned Agent", 440, tableTop);

            // Draw line below header
            doc.moveTo(40, tableTop + 15)
               .lineTo(555, tableTop + 15)
               .strokeColor("#94a3b8")
               .lineWidth(1)
               .stroke();

            let y = tableTop + 25;
            let index = 1;

            doc.font("Helvetica").fontSize(9);
            
            for (const visit of visits) {
                // Page overflow check
                if (y > 720) {
                    doc.addPage();
                    y = 50;
                    
                    // Table Header again
                    doc.font("Helvetica-Bold").fontSize(10);
                    doc.text("S.No", 40, y);
                    doc.text("Customer Details", 80, y);
                    doc.text("Property Site", 240, y);
                    doc.text("Time", 380, y);
                    doc.text("Assigned Agent", 440, y);
                    
                    doc.moveTo(40, y + 15)
                       .lineTo(555, y + 15)
                       .strokeColor("#94a3b8")
                       .lineWidth(1)
                       .stroke();
                    
                    y += 25;
                    doc.font("Helvetica").fontSize(9);
                }

                // Row text
                doc.text(`${index}`, 40, y);
                
                // Customer details block
                const custText = `${visit.customerName}\nPhone: ${visit.customerPhone || "-"}\nEmail: ${visit.customerEmail || "-"}`;
                doc.text(custText, 80, y, { width: 150 });
                
                // Project site details
                doc.text(`${visit.projectName}\n(ID: ${visit.projectAssociation})`, 240, y, { width: 130 });
                
                // Time
                doc.text(`${visit.visitTime}`, 380, y);
                
                // Agent details
                doc.text(`${visit.assignedAgent || "-"}`, 440, y, { width: 115 });

                // Draw separator line
                y += 50;
                doc.moveTo(40, y - 5)
                   .lineTo(555, y - 5)
                   .strokeColor("#f1f5f9")
                   .lineWidth(0.5)
                   .stroke();
                
                index++;
            }

            // Footer
            const pageCount = doc.bufferedPageRange().count;
            for (let i = 0; i < pageCount; i++) {
                doc.switchToPage(i);
                doc.fillColor("#64748b")
                   .fontSize(8)
                   .text(`Page ${i + 1} of ${pageCount}`, 40, 800, { align: "center", width: 515 });
            }

            doc.end();
        } catch (error) {
            reject(error);
        }
    });
};

const sendSummaryReport = async (targetDateStr: string, visits: SiteVisit[], config: MailConfig) => {
    if (visits.length === 0) {
        console.log("ℹ️ No visits to include in daily summary report.");
        return;
    }

    try {
        console.log(`⏱️ Generating daily site visit PDF report for date ${targetDateStr}...`);
        
        // Resolve agent phone numbers for the PDF details
        const formattedVisits = [];
        for (const v of visits) {
            let phoneStr = "-";
            if (v.assignedAgent) {
                const agent = await MarketingAgent.findOne({ where: { name: v.assignedAgent } });
                if (agent && agent.phone) {
                    phoneStr = agent.phone;
                }
            }
            formattedVisits.push({
                customerName: v.customerName,
                customerPhone: v.customerPhone,
                customerEmail: v.customerEmail,
                projectName: v.projectName,
                projectAssociation: v.projectAssociation,
                visitTime: v.visitTime,
                assignedAgent: v.assignedAgent ? `${v.assignedAgent} (${phoneStr})` : "-"
            });
        }

        const pdfBuffer = await generateScheduledVisitsPdf(targetDateStr, formattedVisits);

        const recipient = config.summaryEmail || "jkfutureinfra@gmail.com";
        const subject = `JK Future Infra - Daily Scheduled Site Visits Summary [${targetDateStr}]`;
        const textBody = `Hello Admin,\n\nPlease find attached the daily summary PDF report of scheduled site visits for ${targetDateStr}.\n\nTotal Scheduled Visits: ${visits.length}\n\nWarm regards,\nJK Future Infra System`;

        if (config.deliveryMode === "simulation") {
            console.log("=========================================");
            console.log(`✉️ SIMULATED DAILY SUMMARY REPORT EMAIL`);
            console.log(`To: ${recipient}`);
            console.log(`Subject: ${subject}`);
            console.log(`Attachment: Scheduled_Site_Visits_${targetDateStr}.pdf (${pdfBuffer.length} bytes)`);
            console.log("=========================================");
            await logAuditAction(null, "Daily Summary Simulated", `Simulated daily summary email to "${recipient}" with PDF report for ${targetDateStr}`, "Success");
        } else {
            const transporter = nodemailer.createTransport({
                host: config.smtpHost,
                port: config.smtpPort,
                secure: config.smtpPort === 465,
                auth: config.smtpUser ? {
                    user: config.smtpUser,
                    pass: config.smtpPass
                } : undefined
            });

            await transporter.sendMail({
                from: config.senderEmail,
                to: recipient,
                subject: subject,
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #ffffff;">
                      <div style="text-align: center; border-bottom: 2px solid #0f2b46; padding-bottom: 15px; margin-bottom: 20px;">
                        <img src="cid:logo" alt="JK Future Infra Logo" style="height: 50px;" />
                      </div>
                      <div style="font-size: 14px; line-height: 1.6; color: #334155;">
                        <p>Hello Admin,</p>
                        <p>Please find attached the daily summary PDF report of scheduled site visits for <strong>${targetDateStr}</strong>.</p>
                        <p>Total Scheduled Visits: <strong>${visits.length}</strong></p>
                        <p>Warm regards,<br />JK Future Infra System</p>
                      </div>
                    </div>
                `,
                attachments: [
                    {
                        filename: `Scheduled_Site_Visits_${targetDateStr}.pdf`,
                        content: pdfBuffer
                    },
                    {
                        filename: 'logo.png',
                        path: path.join(__dirname, '../../uploads/logo.png'),
                        cid: 'logo'
                    }
                ]
            });
            console.log(`✉️ Sent daily summary PDF report to ${recipient}`);
            await logAuditAction(null, "Daily Summary Sent", `Sent daily summary email to "${recipient}" with PDF report for ${targetDateStr}`, "Success");
        }
    } catch (err: any) {
        console.error("❌ Failed to generate or send daily summary report email:", err);
        await logAuditAction(null, "Daily Summary Failure", `Failed to send daily summary report: ${err.message || err}`, "Failed");
    }
};

// POST process reminders for all pending site visits
router.post("/process-reminders", authenticateToken, async (req, res, next) => {
    try {
        const config = await MailConfig.findByPk("default") || await MailConfig.create({
            id: "default",
            deliveryMode: "simulation"
        });

        const pendingVisits = await SiteVisit.findAll({
            where: { emailStatus: "Pending" }
        });

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let sentCount = 0;
        let skippedCount = 0;
        let failedCount = 0;
        const summaryVisits: SiteVisit[] = [];

        // Set up SMTP transporter if smtp mode
        let transporter: nodemailer.Transporter | null = null;
        if (config.deliveryMode === "smtp") {
            transporter = nodemailer.createTransport({
                host: config.smtpHost,
                port: config.smtpPort,
                secure: config.smtpPort === 465,
                auth: config.smtpUser ? {
                    user: config.smtpUser,
                    pass: config.smtpPass
                } : undefined
            });
        }

        for (const visit of pendingVisits) {
            const visitDate = new Date(visit.visitDate);
            visitDate.setHours(0, 0, 0, 0);

            const diffTime = visitDate.getTime() - today.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            // Check if it's already today or in the past (too late for a reminder)
            if (diffDays < config.sendBeforeDays) {
                await visit.update({ emailStatus: "Skipped" });
                skippedCount++;
                continue;
            }

            // Check if it's outside the tracking window (more than 5 days out)
            if (diffDays > config.triggerWindowDays) {
                // Do nothing: keep Pending for later checks
                continue;
            }

            // If it falls exactly on the target reminder day (e.g. 1 day before)
            if (diffDays === config.sendBeforeDays) {
                try {
                    // Fetch location details
                    let location = "At the project site";
                    const project = await Project.findByPk(visit.projectAssociation);
                    if (project) {
                        location = project.location;
                    }

                    let assignedAgentStr = visit.assignedAgent || "Our Property Relations Advisor";
                    let assignedAgentPhoneStr = "-";
                    if (visit.assignedAgent) {
                        const agent = await MarketingAgent.findOne({ where: { name: visit.assignedAgent } });
                        if (agent) {
                            assignedAgentStr = agent.name;
                            if (agent.phone) {
                                assignedAgentPhoneStr = agent.phone;
                            }
                        }
                    }

                    const vars = {
                        customerName: visit.customerName,
                        projectName: visit.projectName,
                        visitDate: visit.visitDate,
                        visitTime: visit.visitTime,
                        assignedAgent: assignedAgentStr,
                        assignedAgentPhone: assignedAgentPhoneStr,
                        location: location
                    };

                    const compiledSubject = compileTemplate(config.emailSubject, vars);
                    const compiledBody = compileTemplate(config.emailTemplate, vars);

                    if (config.deliveryMode === "simulation") {
                        console.log("=========================================");
                        console.log(`✉️ SIMULATED SITE VISIT EMAIL REMINDER`);
                        console.log(`To: ${visit.customerEmail} (${visit.customerName})`);
                        console.log(`Subject: ${compiledSubject}`);
                        console.log(`Body:\n${compiledBody}`);
                        console.log("=========================================");
                        
                        await visit.update({
                            emailStatus: "Sent",
                            emailSentDate: new Date().toISOString()
                        });
                        await logAuditAction(req, "Site Visit Email Simulated", `Simulated reminder email to "${visit.customerEmail}" for site visit on ${visit.visitDate}`, "Success");
                        sentCount++;
                        summaryVisits.push(visit);
                    } else if (transporter) {
                        await transporter.sendMail({
                            from: config.senderEmail,
                            to: visit.customerEmail,
                            subject: compiledSubject,
                            html: `
                                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #ffffff;">
                                  <div style="text-align: center; border-bottom: 2px solid #0f2b46; padding-bottom: 15px; margin-bottom: 20px;">
                                    <img src="cid:logo" alt="JK Future Infra Logo" style="height: 50px;" />
                                  </div>
                                  <div style="font-size: 14px; line-height: 1.6; color: #334155; white-space: pre-line;">
                                    ${compiledBody.replace(/\n/g, '<br />')}
                                  </div>
                                </div>
                            `,
                            attachments: [
                                {
                                    filename: 'logo.png',
                                    path: path.join(__dirname, '../../uploads/logo.png'),
                                    cid: 'logo'
                                }
                            ]
                        });

                        await visit.update({
                            emailStatus: "Sent",
                            emailSentDate: new Date().toISOString()
                        });
                        await logAuditAction(req, "Site Visit Email Sent", `Sent reminder email to "${visit.customerEmail}" for site visit on ${visit.visitDate}`, "Success");
                        sentCount++;
                        summaryVisits.push(visit);
                    }
                } catch (err: any) {
                    console.error(`Failed to send email to ${visit.customerEmail}:`, err);
                    await visit.update({ emailStatus: "Failed" });
                    await logAuditAction(req, "Site Visit Email Failure", `Failed to send reminder email to "${visit.customerEmail}": ${err.message || err}`, "Failed");
                    failedCount++;
                }
            }
        }

        await logAuditAction(req, "Site Visit Reminders Triggered", `Processed reminder queue (Sent/Simulated: ${sentCount}, Skipped: ${skippedCount}, Failed: ${failedCount})`, "Success");

        // Trigger daily summary PDF report email if any visits were processed
        if (summaryVisits.length > 0) {
            const targetDate = new Date();
            targetDate.setDate(targetDate.getDate() + config.sendBeforeDays);
            const targetDateStr = targetDate.toISOString().split("T")[0];
            await sendSummaryReport(targetDateStr, summaryVisits, config);
        }

        return res.json({
            success: true,
            data: {
                totalProcessed: pendingVisits.length,
                sent: sentCount,
                skipped: skippedCount,
                failed: failedCount
            }
        });
    } catch (error) {
        next(error);
    }
});

// POST manually send/re-send email immediately (bypass date check)
router.post("/:id/send-now", authenticateToken, async (req, res, next) => {
    let visit: SiteVisit | null = null;
    try {
        visit = await SiteVisit.findByPk(req.params.id);
        if (!visit) {
            return res.status(404).json({ success: false, message: "Site visit not found" });
        }

        const config = await MailConfig.findByPk("default") || await MailConfig.create({
            id: "default",
            deliveryMode: "simulation"
        });

        let location = "At the project site";
        const project = await Project.findByPk(visit.projectAssociation);
        if (project) {
            location = project.location;
        }

        let assignedAgentStr = visit.assignedAgent || "Our Property Relations Advisor";
        let assignedAgentPhoneStr = "-";
        if (visit.assignedAgent) {
            const agent = await MarketingAgent.findOne({ where: { name: visit.assignedAgent } });
            if (agent) {
                assignedAgentStr = agent.name;
                if (agent.phone) {
                    assignedAgentPhoneStr = agent.phone;
                }
            }
        }

        const vars = {
            customerName: visit.customerName,
            projectName: visit.projectName,
            visitDate: visit.visitDate,
            visitTime: visit.visitTime,
            assignedAgent: assignedAgentStr,
            assignedAgentPhone: assignedAgentPhoneStr,
            location: location
        };

        const compiledSubject = compileTemplate(config.emailSubject, vars);
        const compiledBody = compileTemplate(config.emailTemplate, vars);

        if (config.deliveryMode === "simulation") {
            console.log("=========================================");
            console.log(`✉️ MANUAL SIMULATED SITE VISIT EMAIL REMINDER`);
            console.log(`To: ${visit.customerEmail} (${visit.customerName})`);
            console.log(`Subject: ${compiledSubject}`);
            console.log(`Body:\n${compiledBody}`);
            console.log("=========================================");

            await visit.update({
                emailStatus: "Sent",
                emailSentDate: new Date().toISOString()
            });

            return res.json({ success: true, message: "Email simulated successfully." });
        } else {
            const transporter = nodemailer.createTransport({
                host: config.smtpHost,
                port: config.smtpPort,
                secure: config.smtpPort === 465,
                auth: config.smtpUser ? {
                    user: config.smtpUser,
                    pass: config.smtpPass
                } : undefined
            });

            await transporter.sendMail({
                from: config.senderEmail,
                to: visit.customerEmail,
                subject: compiledSubject,
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #ffffff;">
                      <div style="text-align: center; border-bottom: 2px solid #0f2b46; padding-bottom: 15px; margin-bottom: 20px;">
                        <img src="cid:logo" alt="JK Future Infra Logo" style="height: 50px;" />
                      </div>
                      <div style="font-size: 14px; line-height: 1.6; color: #334155; white-space: pre-line;">
                        ${compiledBody.replace(/\n/g, '<br />')}
                      </div>
                    </div>
                `,
                attachments: [
                    {
                        filename: 'logo.png',
                        path: path.join(__dirname, '../../uploads/logo.png'),
                        cid: 'logo'
                    }
                ]
            });

            await visit.update({
                emailStatus: "Sent",
                emailSentDate: new Date().toISOString()
            });

            return res.json({ success: true, message: `Email sent successfully to ${visit.customerEmail}!` });
        }
    } catch (error: any) {
        console.error("Manual send failed:", error);
        await visit?.update({ emailStatus: "Failed" });
        return res.status(500).json({ success: false, message: `Send failed: ${error.message || error}` });
    }
});

export const runAutomatedSiteVisitReminders = async () => {
    try {
        console.log("⏱️ Running automated background site visit reminder processor...");
        const config = await MailConfig.findByPk("default");
        if (!config) {
            console.log("⚠️ No mail configuration found. Skipping background reminders.");
            return;
        }

        const pendingVisits = await SiteVisit.findAll({
            where: { emailStatus: "Pending" }
        });

        if (pendingVisits.length === 0) {
            console.log("ℹ️ No pending site visit reminders to process.");
            return;
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let sentCount = 0;
        let skippedCount = 0;
        let failedCount = 0;
        const summaryVisits: SiteVisit[] = [];

        let transporter: nodemailer.Transporter | null = null;
        if (config.deliveryMode === "smtp") {
            transporter = nodemailer.createTransport({
                host: config.smtpHost,
                port: config.smtpPort,
                secure: config.smtpPort === 465,
                auth: config.smtpUser ? {
                    user: config.smtpUser,
                    pass: config.smtpPass
                } : undefined
            });
        }

        for (const visit of pendingVisits) {
            const visitDate = new Date(visit.visitDate);
            visitDate.setHours(0, 0, 0, 0);

            const diffTime = visitDate.getTime() - today.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays < config.sendBeforeDays) {
                await visit.update({ emailStatus: "Skipped" });
                skippedCount++;
                continue;
            }

            if (diffDays > config.triggerWindowDays) {
                continue;
            }

            if (diffDays === config.sendBeforeDays) {
                try {
                    let location = "At the project site";
                    const project = await Project.findByPk(visit.projectAssociation);
                    if (project) {
                        location = project.location;
                    }

                    let assignedAgentStr = visit.assignedAgent || "Our Property Relations Advisor";
                    let assignedAgentPhoneStr = "-";
                    if (visit.assignedAgent) {
                        const agent = await MarketingAgent.findOne({ where: { name: visit.assignedAgent } });
                        if (agent) {
                            assignedAgentStr = agent.name;
                            if (agent.phone) {
                                assignedAgentPhoneStr = agent.phone;
                            }
                        }
                    }

                    const vars = {
                        customerName: visit.customerName,
                        projectName: visit.projectName,
                        visitDate: visit.visitDate,
                        visitTime: visit.visitTime,
                        assignedAgent: assignedAgentStr,
                        assignedAgentPhone: assignedAgentPhoneStr,
                        location: location
                    };

                    const compiledSubject = compileTemplate(config.emailSubject, vars);
                    const compiledBody = compileTemplate(config.emailTemplate, vars);

                    if (config.deliveryMode === "simulation") {
                        console.log("=========================================");
                        console.log(`✉️ AUTOMATED BACKGROUND SITE VISIT EMAIL REMINDER`);
                        console.log(`To: ${visit.customerEmail} (${visit.customerName})`);
                        console.log(`Subject: ${compiledSubject}`);
                        console.log(`Body:\n${compiledBody}`);
                        console.log("=========================================");
                        
                        await visit.update({
                            emailStatus: "Sent",
                            emailSentDate: new Date().toISOString()
                        });
                        await logAuditAction(null, "Site Visit Email Simulated (Auto)", `Simulated reminder email to "${visit.customerEmail}" for site visit on ${visit.visitDate}`, "Success");
                        sentCount++;
                        summaryVisits.push(visit);
                    } else if (transporter) {
                        await transporter.sendMail({
                            from: config.senderEmail,
                            to: visit.customerEmail,
                            subject: compiledSubject,
                            html: `
                                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #ffffff;">
                                  <div style="text-align: center; border-bottom: 2px solid #0f2b46; padding-bottom: 15px; margin-bottom: 20px;">
                                    <img src="cid:logo" alt="JK Future Infra Logo" style="height: 50px;" />
                                  </div>
                                  <div style="font-size: 14px; line-height: 1.6; color: #334155; white-space: pre-line;">
                                    ${compiledBody.replace(/\n/g, '<br />')}
                                  </div>
                                </div>
                            `,
                            attachments: [
                                {
                                    filename: 'logo.png',
                                    path: path.join(__dirname, '../../uploads/logo.png'),
                                    cid: 'logo'
                                }
                            ]
                        });

                        await visit.update({
                            emailStatus: "Sent",
                            emailSentDate: new Date().toISOString()
                        });
                        await logAuditAction(null, "Site Visit Email Sent (Auto)", `Sent reminder email to "${visit.customerEmail}" for site visit on ${visit.visitDate}`, "Success");
                        sentCount++;
                        summaryVisits.push(visit);
                    }
                } catch (err: any) {
                    console.error(`Failed to send email to ${visit.customerEmail}:`, err);
                    await visit.update({ emailStatus: "Failed" });
                    await logAuditAction(null, "Site Visit Email Failure (Auto)", `Failed to send reminder email to "${visit.customerEmail}": ${err.message || err}`, "Failed");
                    failedCount++;
                }
            }
        }

        if (sentCount > 0 || skippedCount > 0 || failedCount > 0) {
            await logAuditAction(null, "Site Visit Reminders Triggered (Auto)", `Processed reminder queue (Sent/Simulated: ${sentCount}, Skipped: ${skippedCount}, Failed: ${failedCount})`, "Success");
        }

        // Trigger daily summary PDF report email if any visits were processed
        if (summaryVisits.length > 0) {
            const targetDate = new Date();
            targetDate.setDate(targetDate.getDate() + config.sendBeforeDays);
            const targetDateStr = targetDate.toISOString().split("T")[0];
            await sendSummaryReport(targetDateStr, summaryVisits, config);
        }
    } catch (err) {
        console.error("❌ Failed to process automated reminders background task:", err);
    }
};

export default router;
