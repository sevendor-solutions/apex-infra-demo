import { Table, Column, Model, DataType, BeforeValidate, CreatedAt, UpdatedAt } from "sequelize-typescript";

@Table({ tableName: "loans" })
export class Loan extends Model {
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
    providerName!: string;

    @Column({
        type: DataType.STRING,
        allowNull: false,
        unique: true
    })
    accountNumber!: string;

    @Column({
        type: DataType.STRING,
        allowNull: false
    })
    type!: string;

    @Column({
        type: DataType.DOUBLE,
        allowNull: false
    })
    amount!: number;

    @Column({
        type: DataType.DOUBLE,
        allowNull: false
    })
    interestRate!: number;

    @Column({
        type: DataType.STRING,
        allowNull: false
    })
    startDate!: string;

    @Column({
        type: DataType.STRING,
        allowNull: false
    })
    endDate!: string;

    @Column({
        type: DataType.DOUBLE,
        allowNull: false
    })
    emiAmount!: number;

    @Column({
        type: DataType.STRING,
        allowNull: false,
        defaultValue: "Monthly"
    })
    frequency!: string;

    @Column({
        type: DataType.DOUBLE,
        allowNull: false,
        defaultValue: 0
    })
    paidAmount!: number;

    @Column({
        type: DataType.DOUBLE,
        allowNull: false,
        defaultValue: 0
    })
    pendingAmount!: number;

    @Column({
        type: DataType.STRING,
        allowNull: true
    })
    nextDueDate?: string;

    @Column({
        type: DataType.STRING,
        allowNull: true
    })
    documentUrl?: string;

        @Column({
        type: DataType.STRING,
        allowNull: true
    })
    userId?: string;

    @CreatedAt
    createdAt!: Date;

    @UpdatedAt
    updatedAt!: Date;

    @BeforeValidate
    static async generateId(instance: Loan) {
        if (!instance.id) {
            const all = await Loan.findAll();
            let nextNum = 1;
            all.forEach(item => {
                const match = item.id.match(/^ln(\d+)$/);
                if (match) {
                    const num = parseInt(match[1], 10);
                    if (num >= nextNum) {
                        nextNum = num + 1;
                    }
                }
            });
            instance.id = `ln${nextNum}`;
        }
    }
}
