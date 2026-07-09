import { Table, Column, Model, DataType, BeforeValidate, CreatedAt, UpdatedAt } from "sequelize-typescript";

@Table({ tableName: "wallets" })
export class Wallet extends Model {
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
    currentBalance!: number;

    @Column({
        type: DataType.STRING, // "Cash" | "Bank" | "Digital Wallet"
        allowNull: false
    })
    type!: string;

    @CreatedAt
    createdAt!: Date;

    @UpdatedAt
    updatedAt!: Date;

    @BeforeValidate
    static async generateId(instance: Wallet) {
        if (!instance.id) {
            const all = await Wallet.findAll();
            let nextNum = 1;
            all.forEach(item => {
                const match = item.id.match(/^w(\d+)$/);
                if (match) {
                    const num = parseInt(match[1], 10);
                    if (num >= nextNum) {
                        nextNum = num + 1;
                    }
                }
            });
            instance.id = `w${nextNum}`;
        }
    }
}
