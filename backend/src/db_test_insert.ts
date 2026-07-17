import sequelize from "./config/database";
import { Expense } from "./models/Expense";

async function run() {
    try {
        await sequelize.authenticate();
        console.log("Connected to DB successfully.");
        
        // Create an expense
        const newExpense = await Expense.create({
            id: "exptest123",
            party: "Test Vendor",
            expenseCategory: "Cement",
            billDate: "2026-07-17",
            lineItems: [{ item: "Test Item", qty: 1, priceUnit: 15000, taxLabel: "NONE", taxPct: 0, amount: 15000 }],
            paymentType: "Cash",
            roundOff: true,
            totalAmount: 15000,
            paidAmount: 10000,
            pendingAmount: 5000,
            paymentStatus: "Partially Paid"
        });

        console.log("Created test expense:", JSON.stringify(newExpense, null, 2));

        // Fetch it back
        const fetched = await Expense.findByPk("exptest123");
        console.log("Fetched test expense from DB:", JSON.stringify(fetched, null, 2));

        // Clean up
        await fetched?.destroy();
        console.log("Cleaned up test expense.");

    } catch (error) {
        console.error("Error executing test script:", error);
    } finally {
        await sequelize.close();
    }
}

run();
