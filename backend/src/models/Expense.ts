import { Table, Column, Model, DataType, BeforeValidate, CreatedAt, UpdatedAt } from "sequelize-typescript";

export interface ExpenseLineItem {
    item: string;
    qty: number;
    priceUnit: number;
    taxLabel: string;   // e.g. "NONE", "5%", "12%", "18%", "28%"
    taxPct: number;     // 0, 5, 12, 18, 28
    amount: number;
}

@Table({ tableName: "expenses" })
export class Expense extends Model {
    @Column({
        type: DataType.STRING,
        primaryKey: true,
        allowNull: false
    })
    id!: string;

    @Column({
        type: DataType.STRING,
        allowNull: false
    })
    party!: string;

    @Column({
        type: DataType.STRING,
        allowNull: true
    })
    location?: string;

    @Column({
        type: DataType.STRING,
        allowNull: true
    })
    apartment?: string;

    @Column({
        type: DataType.STRING,
        allowNull: true
    })
    projectName?: string;

    @Column({
        type: DataType.STRING,
        allowNull: false
    })
    expenseCategory!: string;  // category name (FK by name to ExpenseCategory)

    @Column({
        type: DataType.STRING,
        allowNull: true
    })
    expenseNo?: string;

    @Column({
        type: DataType.DATEONLY,
        allowNull: false
    })
    billDate!: string;

    @Column({
        type: DataType.STRING,
        allowNull: true
    })
    stateOfSupply?: string;

    @Column({
        type: DataType.JSON,
        allowNull: false,
        defaultValue: []
    })
    lineItems!: ExpenseLineItem[];

    @Column({
        type: DataType.STRING,
        allowNull: true
    })
    paymentType?: string;

    @Column({
        type: DataType.STRING,
        allowNull: true
    })
    walletId?: string;

    @Column({
        type: DataType.STRING,
        allowNull: true
    })
    accountName?: string;

    @Column({
        type: DataType.STRING,
        allowNull: true
    })
    referenceNo?: string;

    @Column({
        type: DataType.BOOLEAN,
        allowNull: false,
        defaultValue: true
    })
    roundOff!: boolean;

    @Column({
        type: DataType.FLOAT,
        allowNull: false,
        defaultValue: 0
    })
    totalAmount!: number;

    @Column({
        type: DataType.STRING,
        allowNull: true
    })
    notes?: string;

        @Column({
        type: DataType.STRING,
        allowNull: true
    })
    userId?: string;

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

    @BeforeValidate
    static autoId(instance: Expense) {
        // ID set by caller (exp1, exp2, ...)
    }
}
