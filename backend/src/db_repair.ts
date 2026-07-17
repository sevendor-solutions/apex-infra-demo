import sequelize from "./config/database";
import { Expense } from "./models/Expense";

async function run() {
    try {
        await sequelize.authenticate();
        console.log("Connected to DB successfully.");
        
        const expense = await Expense.findByPk("exp1");
        if (expense) {
            console.log("Found exp1 before repair:", JSON.stringify(expense, null, 2));
            
            // Repair the values
            expense.paidAmount = 10000;
            expense.pendingAmount = 17325 - 10000;
            expense.paymentStatus = "Partially Paid";
            await expense.save();
            
            console.log("Repaired exp1 successfully:", JSON.stringify(expense, null, 2));
        } else {
            console.log("exp1 not found.");
        }
    } catch (error) {
        console.error("Error executing repair script:", error);
    } finally {
        await sequelize.close();
    }
}

run();
