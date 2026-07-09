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
    name: 'J. K. Rama Rao',
    email: 'ramarao@jkfutureinfra.com',
    password: 'admin123',
    allowedScreens: ['dashboard', 'projects', 'marketing', 'sites', 'gallery', 'blogs', 'project_enquiries', 'marketing_enquiries', 'careers', 'users', 'masters']
  }
];

const INITIAL_PROJECTS: any[] = [];

const INITIAL_MARKETING: any[] = [];

const INITIAL_BLOGS: any[] = [];

const INITIAL_GALLERY: any[] = [];

const INITIAL_ENQUIRIES: any[] = [];

export async function seedDatabase() {
  try {
    // 0. Auto-migrate legacy non-serial IDs for all tables
    try {
      // 1) Cities
      const allCities = await City.findAll({ order: [['createdAt', 'ASC']] });
      let nextCityNum = 1;
      for (const city of allCities) {
        const oldId = city.id;
        const isLegacyId = oldId.startsWith('c_') || !/^c\d+$/.test(oldId);
        
        if (isLegacyId) {
          const newId = `c${nextCityNum++}`;
          
          await LocationMaster.update(
            { cityId: newId },
            { where: { cityId: oldId } }
          );
          
          await City.sequelize?.query(`UPDATE cities SET id = :newId WHERE id = :oldId`, {
            replacements: { newId, oldId }
          });
          
          console.log(`🛠️ Cleaned up city ID: ${oldId} -> ${newId}`);
        } else {
          const num = parseInt(oldId.substring(1), 10);
          if (num >= nextCityNum) nextCityNum = num + 1;
        }
      }

      // 2) Locations
      const allLocations = await LocationMaster.findAll({ order: [['createdAt', 'ASC']] });
      let nextLocNum = 1;
      for (const loc of allLocations) {
        const oldId = loc.id;
        const isLegacyId = oldId.startsWith('l_') || oldId.startsWith('loc_') || !/^loc\d+$/.test(oldId);
        
        if (isLegacyId) {
          const newId = `loc${nextLocNum++}`;
          
          await LocationMaster.sequelize?.query(`UPDATE locations SET id = :newId WHERE id = :oldId`, {
            replacements: { newId, oldId }
          });
          console.log(`🛠️ Cleaned up location ID: ${oldId} -> ${newId}`);
        } else {
          const num = parseInt(oldId.substring(3), 10);
          if (num >= nextLocNum) nextLocNum = num + 1;
        }
      }

      // 3) Projects & Marketing
      const allProjects = await Project.findAll({ order: [['createdAt', 'ASC']] });
      let nextProjectNum = 1;
      let nextMarketingNum = 1;
      for (const proj of allProjects) {
        const oldId = proj.id;
        const prefix = proj.isMarketing ? 'm' : 'p';
        const isLegacyId = oldId.startsWith('p_') || oldId.startsWith('m_') || !/^[pm]\d+$/.test(oldId);
        
        if (isLegacyId) {
          const newId = proj.isMarketing ? `m${nextMarketingNum++}` : `p${nextProjectNum++}`;
          
          await GalleryItem.update(
            { projectAssociation: newId },
            { where: { projectAssociation: oldId } }
          );
          
          await Enquiry.update(
            { projectAssociation: newId },
            { where: { projectAssociation: oldId } }
          );
          
          await Project.sequelize?.query(`UPDATE projects SET id = :newId WHERE id = :oldId`, {
            replacements: { newId, oldId }
          });
          
          console.log(`🛠️ Cleaned up project ID: ${oldId} -> ${newId}`);
        } else {
          const num = parseInt(oldId.substring(1), 10);
          if (proj.isMarketing) {
            if (num >= nextMarketingNum) nextMarketingNum = num + 1;
          } else {
            if (num >= nextProjectNum) nextProjectNum = num + 1;
          }
        }
      }

      // 4) Users
      const allUsers = await User.findAll({ order: [['createdAt', 'ASC']] });
      let nextUserNum = 1;
      for (const u of allUsers) {
        const oldId = u.id;
        const isLegacyId = oldId.startsWith('u_') || !/^u\d+$/.test(oldId);
        
        if (isLegacyId) {
          const newId = `u${nextUserNum++}`;
          
          await UserSessionLog.update(
            { userId: newId },
            { where: { userId: oldId } }
          );
          
          await User.sequelize?.query(`UPDATE users SET id = :newId WHERE id = :oldId`, {
            replacements: { newId, oldId }
          });
          console.log(`🛠️ Cleaned up user ID: ${oldId} -> ${newId}`);
        } else {
          const num = parseInt(oldId.substring(1), 10);
          if (num >= nextUserNum) nextUserNum = num + 1;
        }
      }

      // 5) Blogs
      const allBlogs = await Blog.findAll({ order: [['createdAt', 'ASC']] });
      let nextBlogNum = 1;
      for (const b of allBlogs) {
        const oldId = b.id;
        const isLegacyId = oldId.startsWith('b_') || !/^b\d+$/.test(oldId);
        
        if (isLegacyId) {
          const newId = `b${nextBlogNum++}`;
          await Blog.sequelize?.query(`UPDATE blogs SET id = :newId WHERE id = :oldId`, {
            replacements: { newId, oldId }
          });
          console.log(`🛠️ Cleaned up blog ID: ${oldId} -> ${newId}`);
        } else {
          const num = parseInt(oldId.substring(1), 10);
          if (num >= nextBlogNum) nextBlogNum = num + 1;
        }
      }

      // 6) Gallery Items
      const allGallery = await GalleryItem.findAll({ order: [['createdAt', 'ASC']] });
      let nextGalleryNum = 1;
      for (const g of allGallery) {
        const oldId = g.id;
        const isLegacyId = oldId.startsWith('g_') || !/^g\d+$/.test(oldId);
        
        if (isLegacyId) {
          const newId = `g${nextGalleryNum++}`;
          await GalleryItem.sequelize?.query(`UPDATE gallery_items SET id = :newId WHERE id = :oldId`, {
            replacements: { newId, oldId }
          });
          console.log(`🛠️ Cleaned up gallery item ID: ${oldId} -> ${newId}`);
        } else {
          const num = parseInt(oldId.substring(1), 10);
          if (num >= nextGalleryNum) nextGalleryNum = num + 1;
        }
      }

      // 7) Enquiries
      const allEnqs = await Enquiry.findAll({ order: [['createdAt', 'ASC']] });
      let nextEnqNum = 1;
      for (const e of allEnqs) {
        const oldId = e.id;
        const isLegacyId = oldId.startsWith('enq_') || oldId.startsWith('e_') || !/^e\d+$/.test(oldId);
        
        if (isLegacyId) {
          const newId = `e${nextEnqNum++}`;
          await Enquiry.sequelize?.query(`UPDATE enquiries SET id = :newId WHERE id = :oldId`, {
            replacements: { newId, oldId }
          });
          console.log(`🛠️ Cleaned up enquiry ID: ${oldId} -> ${newId}`);
        } else {
          const num = parseInt(oldId.substring(1), 10);
          if (num >= nextEnqNum) nextEnqNum = num + 1;
        }
      }

      // 8) Job Applications
      const allApps = await JobApplication.findAll({ order: [['createdAt', 'ASC']] });
      let nextAppNum = 1;
      for (const ja of allApps) {
        const oldId = ja.id;
        const isLegacyId = oldId.startsWith('ja_') || oldId.startsWith('app_') || !/^ja\d+$/.test(oldId);
        
        if (isLegacyId) {
          const newId = `ja${nextAppNum++}`;
          await JobApplication.sequelize?.query(`UPDATE job_applications SET id = :newId WHERE id = :oldId`, {
            replacements: { newId, oldId }
          });
          console.log(`🛠️ Cleaned up job application ID: ${oldId} -> ${newId}`);
        } else {
          const num = parseInt(oldId.substring(2), 10);
          if (num >= nextAppNum) nextAppNum = num + 1;
        }
      }
    } catch (migrationError) {
      console.error("Failed to run automated city/location ID serial migration:", migrationError);
    }


    // Clean up existing mock records from the database
    await Project.destroy({
      where: {
        id: ['p1', 'p2', 'p3', 'p7', 'p8', 'm1', 'm2', 'm3', 'm4', 'm5', 'm6', 'm7', 'm8', 'm9', 'm10', 'm11']
      }
    });
    await Blog.destroy({
      where: {
        id: ['b1', 'b2', 'b3']
      }
    });
    await GalleryItem.destroy({
      where: {
        id: ['g1', 'g2', 'g3', 'g4', 'g5', 'g6', 'g7', 'g8', 'g9', 'g10']
      }
    });
    await Enquiry.destroy({
      where: {
        id: ['e1', 'e2']
      }
    });
    await LocationMaster.destroy({
      where: {
        id: ['loc1', 'loc2', 'loc3', 'loc4', 'loc5', 'loc6', 'loc7', 'loc8', 'loc9', 'loc10', 'loc11', 'loc12', 'loc13']
      }
    });
    await City.destroy({
      where: {
        id: ['c1', 'c2', 'c3']
      }
    });

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
    // Remove extra default users from the database if they exist
    await User.destroy({
      where: {
        id: ['u2', 'u3']
      }
    });

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
        smtpUser: "info@sevendorsolutions.com",
        smtpPass: "Chinna@123",
        senderEmail: "info@sevendorsolutions.com",
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
      console.log("🌱 Updating MailConfig database credentials to SecureServer SMTP...");
      await mailConfig.update({
        smtpHost: "smtpout.secureserver.net",
        smtpPort: 587,
        smtpUser: "info@sevendorsolutions.com",
        smtpPass: "Chinna@123",
        senderEmail: "info@sevendorsolutions.com",
        deliveryMode: "smtp"
      });
    }

    // 8. Seed Site Visits (Removed static site visit data as requested)

    // Seed Marketing Agents (Removed mock marketing agents as requested)
    await MarketingAgent.destroy({
      where: {
        id: ["ma1", "ma2", "ma3", "ma4"]
      }
    });

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

    // Clean up mock user roles (keep only admin)
    await User.destroy({
      where: {
        username: ["accountant", "salesuser", "inventory"]
      }
    });

    // No mock wallets, customers, suppliers, or inventory items seeded as requested

    console.log("✅ Database Seeding completed successfully!");
  } catch (error) {
    console.error("❌ Error during database seeding:", error);
  }
}
