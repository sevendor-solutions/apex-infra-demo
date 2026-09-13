import { Table, Column, Model, DataType, CreatedAt, UpdatedAt } from "sequelize-typescript";

@Table({ tableName: "accounting_activities" })
export class AccountingActivity extends Model {
    @Column({
        type: DataType.UUID,
        defaultValue: DataType.UUIDV4,
        primaryKey: true
    })
    id!: string;

    @Column({
        type: DataType.STRING,
        allowNull: false
    })
    module!: string; // e.g. "Invoices", "Payment-In", "Payment-Out", "Expenses", "Quotations", "Wallets", "Customers", "Suppliers", "Loans", "Inventory"

    @Column({
        type: DataType.STRING,
        allowNull: false
    })
    activityType!: "INSERT" | "UPDATE" | "DELETE";

    @Column({
        type: DataType.STRING,
        allowNull: true
    })
    recordId?: string; // e.g. Invoice #, Receipt #, Expense No, Customer Name

    @Column({
        type: DataType.TEXT,
        allowNull: false
    })
    description!: string;

    @Column({
        type: DataType.DOUBLE,
        allowNull: true,
        defaultValue: 0
    })
    amount?: number;

    @Column({
        type: DataType.STRING,
        allowNull: false
    })
    userName!: string;

    @Column({
        type: DataType.STRING,
        allowNull: false,
        defaultValue: "Admin"
    })
    userRole!: string;

    @Column({
        type: DataType.STRING,
        allowNull: true
    })
    userId?: string;

    @Column({
        type: DataType.STRING,
        allowNull: true
    })
    ipAddress?: string;

    @Column({
        type: DataType.DATE,
        allowNull: false,
        defaultValue: DataType.NOW
    })
    dateTime!: Date;

    @Column({
        type: DataType.TEXT,
        allowNull: true
    })
    metadata?: string;

    @CreatedAt
    @Column({
        type: DataType.DATE,
        allowNull: false,
        defaultValue: DataType.NOW
    })
    createdAt!: Date;

    @UpdatedAt
    @Column({
        type: DataType.DATE,
        allowNull: false,
        defaultValue: DataType.NOW
    })
    updatedAt!: Date;
}
