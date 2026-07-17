import sequelize from "./config/database";
import { Expense } from "./models/Expense";

async function run() {
    try {
        await sequelize.authenticate();
        console.log("Connected to DB successfully.");
        
        // Check table columns in postgres
        const [results] = await sequelize.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'expenses'
        `);
        console.log("Columns in 'expenses' table:");
        console.log(results);

        // Fetch last 3 expenses
        const expenses = await Expense.findAll({
            limit: 3,
            order: [["createdAt", "DESC"]]
        });
        console.log("Last 3 expenses from DB:");
        console.log(JSON.stringify(expenses, null, 2));

    } catch (error) {
        console.error("Error executing test script:", error);
    } finally {
        await sequelize.close();
    }
}

run();
