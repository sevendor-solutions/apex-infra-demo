import { Table, Column, Model, DataType, BeforeValidate, CreatedAt, UpdatedAt } from "sequelize-typescript";

@Table({ tableName: "customers" })
export class Customer extends Model {
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
    name!: string;

    @Column({
        type: DataType.STRING,
        allowNull: false
    })
    mobile!: string;

    @Column({
        type: DataType.STRING,
        allowNull: true
    })
    email?: string;

    @Column({
        type: DataType.STRING,
        allowNull: true
    })
    address?: string;

    @Column({
        type: DataType.STRING,
        allowNull: true
    })
    gstNumber?: string;

    @Column({
        type: DataType.DOUBLE,
        allowNull: false,
        defaultValue: 0
    })
    creditLimit!: number;

    @Column({
        type: DataType.DOUBLE,
        allowNull: false,
        defaultValue: 0
    })
    openingBalance!: number;

    @Column({
        type: DataType.DOUBLE,
        allowNull: false,
        defaultValue: 0
    })
    outstandingAmount!: number;

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
    static async generateId(instance: Customer) {
        if (!instance.id) {
            const all = await Customer.findAll();
            let nextNum = 1;
            all.forEach(item => {
                const match = item.id.match(/^cust(\d+)$/);
                if (match) {
                    const num = parseInt(match[1], 10);
                    if (num >= nextNum) {
                        nextNum = num + 1;
                    }
                }
            });
            instance.id = `cust${nextNum}`;
        }
    }
}
