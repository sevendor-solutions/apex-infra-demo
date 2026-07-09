import { Table, Column, Model, DataType, BeforeValidate, CreatedAt, UpdatedAt } from "sequelize-typescript";

@Table({ tableName: "payments_in" })
export class PaymentIn extends Model {
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
    customerName!: string;

    @Column({
        type: DataType.STRING,
        allowNull: true
    })
    invoiceNumber?: string;

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
        allowNull: false
    })
    paymentMethod!: string;

    @Column({
        type: DataType.STRING,
        allowNull: true
    })
    accountName?: string;

    @Column({
        type: DataType.STRING,
        allowNull: true
    })
    referenceNumber?: string;

    @Column({
        type: DataType.TEXT,
        allowNull: true
    })
    notes?: string;

    @CreatedAt
    createdAt!: Date;

    @UpdatedAt
    updatedAt!: Date;

    @BeforeValidate
    static async generateId(instance: PaymentIn) {
        if (!instance.id) {
            const all = await PaymentIn.findAll();
            let nextNum = 1;
            all.forEach(item => {
                const match = item.id.match(/^pi(\d+)$/);
                if (match) {
                    const num = parseInt(match[1], 10);
                    if (num >= nextNum) {
                        nextNum = num + 1;
                    }
                }
            });
            instance.id = `pi${nextNum}`;
        }
    }
}
