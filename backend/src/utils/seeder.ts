import { City } from "../models/City";
import { LocationMaster } from "../models/LocationMaster";
import { Project } from "../models/Project";
import { Blog } from "../models/Blog";
import { GalleryItem } from "../models/GalleryItem";
import { Enquiry } from "../models/Enquiry";
import { User } from "../models/User";
import { UserSessionLog } from "../models/UserSessionLog";
import { JobApplication } from "../models/JobApplication";
import { PropertyType } from "../models/PropertyType";
import { Facing } from "../models/Facing";
import { Amenity } from "../models/Amenity";
import { SiteVisit } from "../models/SiteVisit";
import { MailConfig } from "../models/MailConfig";
import { MarketingAgent } from "../models/MarketingAgent";

const INITIAL_CITIES: any[] = [];

const INITIAL_PROPERTY_TYPES = [
  { id: 'pt1', name: 'Plots' },
  { id: 'pt2', name: '1 BHK' },
  { id: 'pt3', name: '2 BHK' },
  { id: 'pt4', name: '3 BHK' },
  { id: 'pt5', name: '4 BHK' },
  { id: 'pt6', name: 'Villa' }
];

const INITIAL_FACINGS = [
  { id: 'f1', name: 'North' },
  { id: 'f2', name: 'East' },
  { id: 'f3', name: 'West' },
  { id: 'f4', name: 'South' },
  { id: 'f5', name: 'North East' },
  { id: 'f6', name: 'North West' }
];

const INITIAL_AMENITIES = [
  { id: 'a1', name: 'Clubhouse' },
  { id: 'a2', name: 'Gymnasium' },
  { id: 'a3', name: 'Swimming Pool' },
  { id: 'a4', name: 'Gated Security' }
];

const INITIAL_LOCATIONS: any[] = [];

const INITIAL_USERS = [
  {
    id: 'u1',
    username: 'admin',
    role: 'Admin' as const,
    name: 'JK Future Infra',
    email: 'jkfutureinfra@gmail.com',
    password: 'admin123',
    allowedScreens: [
      'dashboard', 'projects', 'marketing', 'sites', 'project_gallery', 'marketing_gallery', 
      'blogs', 'project_enquiries', 'marketing_enquiries', 'careers', 'users', 'masters', 
      'documents', 'marketing_agents', 'site_visits', 'mail_config', 'audit_logs', 'expenses', 
      'wallets', 'quotations', 'inventory', 'loans', 'invoices', 'customers', 
      'suppliers', 'payments', 'auditor_reports', 'cost_analysis', 'stage_checklist'
    ]
  }
];

const INITIAL_PROJECTS: any[] = [];

const INITIAL_MARKETING: any[] = [];

const INITIAL_BLOGS: any[] = [];

const INITIAL_GALLERY: any[] = [];

const INITIAL_ENQUIRIES: any[] = [];

export async function seedDatabase() {
  try {
    // Note: No delete/destroy queries or ID migrations are performed on startup
    // to ensure that existing live production table data is never removed or altered.

    // 1. Seed Cities
    const cityCount = await City.count();
    if (cityCount === 0) {
      console.log("🌱 Seeding Cities...");
      await City.bulkCreate(INITIAL_CITIES);
    }

    // 2. Seed Locations
    const locationCount = await LocationMaster.count();
    if (locationCount === 0) {
      console.log("🌱 Seeding Locations...");
      await LocationMaster.bulkCreate(INITIAL_LOCATIONS);
    }

    // 2.5 Seed Projects & Marketing Properties
    const projectCount = await Project.count();
    if (projectCount === 0) {
      console.log("🌱 Seeding Projects & Marketing properties...");
      await Project.bulkCreate([...INITIAL_PROJECTS, ...INITIAL_MARKETING]);
    }

    // 2.6 Seed Blogs
    const blogCount = await Blog.count();
    if (blogCount === 0) {
      console.log("🌱 Seeding Blogs...");
      await Blog.bulkCreate(INITIAL_BLOGS);
    }

    // 2.7 Seed Gallery
    const galleryCount = await GalleryItem.count();
    if (galleryCount === 0) {
      console.log("🌱 Seeding Gallery items...");
      await GalleryItem.bulkCreate(INITIAL_GALLERY);
    }

    // 2.8 Seed Enquiries
    const enquiryCount = await Enquiry.count();
    if (enquiryCount === 0) {
      console.log("🌱 Seeding Enquiries...");
      await Enquiry.bulkCreate(INITIAL_ENQUIRIES);
    }

    // 3. Seed Users

    const userCount = await User.count();
    if (userCount === 0) {
      console.log("🌱 Seeding Users (Only Admin)...");
      await User.bulkCreate(INITIAL_USERS);
    } else {
      // Helper to check if a password is already Base64 encoded
      const isBase64 = (str: string): boolean => {
        if (!str || str.trim() === '') return false;
        try {
          const base64Regex = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
          if (!base64Regex.test(str)) return false;
          const decoded = Buffer.from(str, 'base64').toString('utf8');
          const isPrintable = /^[\x20-\x7E]*$/.test(decoded);
          const reEncoded = Buffer.from(decoded, 'utf8').toString('base64');
          return isPrintable && (reEncoded === str);
        } catch {
          return false;
        }
      };

      // Automatically migrate plain text or repair double-encoded passwords to single Base64
      const allUsers = await User.findAll();
      for (const u of allUsers) {
        try {
          if (u.username === 'admin' && (u.name !== 'JK Future Infra' || u.email !== 'jkfutureinfra@gmail.com' || u.allowedScreens.includes('transporters'))) {
            console.log(`🌱 Correcting admin user to JK Future Infra...`);
            u.name = 'JK Future Infra';
            u.email = 'jkfutureinfra@gmail.com';
            u.allowedScreens = [
              'dashboard', 'projects', 'marketing', 'sites', 'project_gallery', 'marketing_gallery', 
              'blogs', 'project_enquiries', 'marketing_enquiries', 'careers', 'users', 'masters', 
              'documents', 'marketing_agents', 'site_visits', 'mail_config', 'audit_logs', 'expenses', 
              'wallets', 'quotations', 'inventory', 'loans', 'invoices', 'customers', 
              'suppliers', 'payments', 'auditor_reports', 'cost_analysis', 'stage_checklist'
            ];
            await u.save();
          }

          const firstDecode = Buffer.from(u.password, 'base64').toString('utf8');
          if (isBase64(u.password) && isBase64(firstDecode)) {
            // Double-encoded: decode it once and save (triggers setter to encode exactly once)
            const decodedPassword = Buffer.from(firstDecode, 'base64').toString('utf8');
            u.password = decodedPassword;
            await u.save();
            console.log(`🔑 Automatically repaired double-encoded password for user '${u.username}' back to single Base64.`);
          } else if (!isBase64(u.password)) {
            const rawPassword = u.password;
            u.password = rawPassword; // Trigger model setter to convert to Base64
            await u.save();
            console.log(`🔑 Automatically migrated existing user '${u.username}' password to Base64 in seeder.`);
          }
        } catch (e) {
          // Ignore
        }
      }
    }



    // 4. Seed Property Types
    const propertyTypeCount = await PropertyType.count();
    if (propertyTypeCount === 0) {
      console.log("🌱 Seeding Property Types...");
      await PropertyType.bulkCreate(INITIAL_PROPERTY_TYPES);
    }

    // 5. Seed Facings
    const facingCount = await Facing.count();
    if (facingCount === 0) {
      console.log("🌱 Seeding Facings...");
      await Facing.bulkCreate(INITIAL_FACINGS);
    }

        // 6. Seed Amenities
    const amenityCount = await Amenity.count();
    if (amenityCount === 0) {
      console.log("🌱 Seeding Amenities...");
      await Amenity.bulkCreate(INITIAL_AMENITIES);
    }

    // 7. Seed MailConfig
    let mailConfig = await MailConfig.findByPk("default");
    if (!mailConfig) {
      console.log("🌱 Seeding MailConfig...");
      await MailConfig.create({
        id: "default",
        deliveryMode: "smtp",
        triggerWindowDays: 5,
        sendBeforeDays: 1,
        smtpHost: "smtpout.secureserver.net",
        smtpPort: 587,
        smtpUser: "info@jkfutureinfra.com",
        smtpPass: "JKFUTUREINFRA@999",
        senderEmail: "info@jkfutureinfra.com",
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
        jwtSecret: process.env.JWT_SECRET || "jk_future_infra_secret_jwt_key_2026",
        facebookPageId: "1234774963046460",
        facebookPageAccessToken: "EAGKi3t8SWnQBRxgbgOB9k8pZBuTZBZCUqUWOU4zzMvfZCnloGDEeiO10o6OvRkfusjteyMIr1WkPRlwsY8xGKY5KY69QWW9GPwUI38FR7mlSTEt1yZB24c6jEc91JnCszDif5w3ZBLIhqINbD6kyAWAVZBehHZBb3v4fLRpZAemwHgZBqASMjRIuBOvcoZBlnEB9IrNZBuFSNqfF",
        instagramAccountId: "17841448069548253"
      });
    } else {
      console.log("🌱 Updating MailConfig database credentials to SecureServer SMTP...");
      await mailConfig.update({
        smtpHost: "smtpout.secureserver.net",
        smtpPort: 587,
        smtpUser: "info@jkfutureinfra.com",
        smtpPass: "JKFUTUREINFRA@999",
        senderEmail: "info@jkfutureinfra.com",
        summaryEmail: "jkfutureinfra@gmail.com",
        deliveryMode: "smtp",
        facebookPageId: "1234774963046460",
        facebookPageAccessToken: "EAGKi3t8SWnQBRxgbgOB9k8pZBuTZBZCUqUWOU4zzMvfZCnloGDEeiO10o6OvRkfusjteyMIr1WkPRlwsY8xGKY5KY69QWW9GPwUI38FR7mlSTEt1yZB24c6jEc91JnCszDif5w3ZBLIhqINbD6kyAWAVZBehHZBb3v4fLRpZAemwHgZBqASMjRIuBOvcoZBlnEB9IrNZBuFSNqfF",
        instagramAccountId: "17841448069548253"
      });
    }

    // 8. Seed Site Visits (Removed static site visit data as requested)



    // 9. Seed Expense Categories
    const { ExpenseCategory } = require("../models/ExpenseCategory");
    const expenseCategoryCount = await ExpenseCategory.count();
    if (expenseCategoryCount === 0) {
      console.log("🌱 Seeding Expense Categories...");
      await ExpenseCategory.bulkCreate([
        { id: "ec1", name: "Steel" },
        { id: "ec2", name: "Cement" },
        { id: "ec3", name: "Sand & Bricks" },
        { id: "ec4", name: "Labor Charges" },
        { id: "ec5", name: "Transport & Logistics" },
        { id: "ec6", name: "Marketing & Ads" },
        { id: "ec7", name: "Miscellaneous Office" }
      ]);
    }

    console.log("✅ Database Seeding completed successfully!");
  } catch (error) {
    console.error("❌ Error during database seeding:", error);
  }
}
