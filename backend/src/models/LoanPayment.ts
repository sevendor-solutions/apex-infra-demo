import { Table, Column, Model, DataType, BeforeValidate, CreatedAt, UpdatedAt } from "sequelize-typescript";

@Table({ tableName: "loan_payments" })
export class LoanPayment extends Model {
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
    loanId!: string;

    @Column({
        type: DataType.STRING,
        allowNull: false
    })
    paymentDate!: string;

    @Column({
        type: DataType.DOUBLE,
        allowNull: false
    })
    amount!: number;

    @Column({
        type: DataType.STRING,
        allowNull: true
    })
    reference?: string;

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
    static async generateId(instance: LoanPayment) {
        if (!instance.id) {
            const all = await LoanPayment.findAll();
            let nextNum = 1;
            all.forEach(item => {
                const match = item.id.match(/^lp(\d+)$/);
                if (match) {
                    const num = parseInt(match[1], 10);
                    if (num >= nextNum) {
                        nextNum = num + 1;
                    }
                }
            });
            instance.id = `lp${nextNum}`;
        }
    }
}
