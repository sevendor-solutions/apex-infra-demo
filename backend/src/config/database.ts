import { Sequelize } from "sequelize-typescript";
import * as dotenv from "dotenv";

import { City } from "../models/City";
import { LocationMaster } from "../models/LocationMaster";
import { Project } from "../models/Project";
import { Blog } from "../models/Blog";
import { GalleryItem } from "../models/GalleryItem";
import { Enquiry } from "../models/Enquiry";
import { User } from "../models/User";
import { JobApplication } from "../models/JobApplication";
import { UserSessionLog } from "../models/UserSessionLog";
import { PropertyType } from "../models/PropertyType";
import { Facing } from "../models/Facing";
import { Amenity } from "../models/Amenity";
import { Document } from "../models/Document";
import { SiteVisit } from "../models/SiteVisit";
import { MailConfig } from "../models/MailConfig";
import { MarketingAgent } from "../models/MarketingAgent";
import { Expense } from "../models/Expense";
import { ExpenseCategory } from "../models/ExpenseCategory";
import { AuditLog } from "../models/AuditLog";

// Import the new JkFutureinfra accounting models
import { Wallet } from "../models/Wallet";
import { WalletTransaction } from "../models/WalletTransaction";
import { Customer } from "../models/Customer";
import { Supplier } from "../models/Supplier";
import { InventoryItem } from "../models/InventoryItem";
import { StockMovement } from "../models/StockMovement";
import { Quotation } from "../models/Quotation";
import { Invoice } from "../models/Invoice";
import { Loan } from "../models/Loan";
import { LoanPayment } from "../models/LoanPayment";
import { PaymentIn } from "../models/PaymentIn";
import { PaymentOut } from "../models/PaymentOut";

dotenv.config();

const dbType = (process.env.DB_TYPE || "postgres").toLowerCase();

let sequelize: Sequelize;

const models = [
    City,
    LocationMaster,
    Project,
    Blog,
    GalleryItem,
    Enquiry,
    User,
    JobApplication,
    UserSessionLog,
    PropertyType,
    Facing,
    Amenity,
    Document,
    SiteVisit,
    MailConfig,
    MarketingAgent,
    Expense,
    ExpenseCategory,
    AuditLog,
    
    // JkFutureinfra accounting models
    Wallet,
    WalletTransaction,
    Customer,
    Supplier,
    InventoryItem,
    StockMovement,
    Quotation,
    Invoice,
    Loan,
    LoanPayment,
    PaymentIn,
    PaymentOut
];

const poolConfig = {
    max: 15,
    min: 0,
    acquire: 30000,
    idle: 10000
};

console.log(`🔌 Initializing Database Connection for: ${dbType.toUpperCase()}`);

switch (dbType) {
    case "mysql":
    case "mariadb":
        sequelize = new Sequelize({
            dialect: "mysql",
            host: process.env.MYSQL_HOST || "localhost",
            port: parseInt(process.env.MYSQL_PORT || "3306"),
            username: process.env.MYSQL_USER || "root",
            password: process.env.MYSQL_PASSWORD || "",
            database: process.env.MYSQL_DB || "test",
            logging: false,
            models: models,
            pool: poolConfig
        });
        break;

    case "mssql":
        sequelize = new Sequelize({
            dialect: "mssql",
            host: process.env.DB_HOST || "localhost",
            port: parseInt(process.env.DB_PORT || "1433"),
            username: process.env.DB_USER || "sa",
            password: process.env.DB_PASSWORD || "",
            database: process.env.DB_NAME || "master",
            logging: false,
            models: models,
            pool: poolConfig,
            dialectOptions: {
                options: {
                    encrypt: false,
                    trustServerCertificate: true,
                }
            }
        });
        break;

    case "sqlite":
        sequelize = new Sequelize({
            dialect: "sqlite",
            storage: process.env.SQLITE_STORAGE || "./database.sqlite",
            logging: false,
            models: models,
        });
        break;

    case "postgres":
    default:
        if (process.env.DATABASE_URL) {
            sequelize = new Sequelize(process.env.DATABASE_URL, {
                dialect: "postgres",
                logging: false,
                models: models,
                pool: poolConfig,
                dialectOptions: {
                    ssl: {
                        require: true,
                        rejectUnauthorized: false,
                    },
                },
            });
        } else {
            sequelize = new Sequelize({
                dialect: "postgres",
                host: process.env.PG_HOST || "localhost",
                port: parseInt(process.env.PG_PORT || "5432"),
                username: process.env.PG_USER || "postgres",
                password: process.env.PG_PASSWORD || "Admin@123",
                database: process.env.PG_DB || "JKFutureDB",
                logging: false,
                models: models,
                pool: poolConfig
            });
        }
        break;
}

export default sequelize;
