import "reflect-metadata";
import sequelize from "../config/database";
import { seedDatabase } from "./seeder";

async function reset() {
  try {
    console.log("⚠️ Forcing Database Reset (dropping all old tables)...");
    await sequelize.sync({ force: true });
    console.log("🔥 Database schema recreated!");
    
    // Seed new data
    await seedDatabase();
    
    console.log("🚀 Database reset and seed completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error during database reset:", error);
    process.exit(1);
  }
}

reset();
