import { Table, Column, Model, DataType, BeforeValidate, CreatedAt, UpdatedAt } from "sequelize-typescript";

@Table({ tableName: "wallet_transactions" })
export class WalletTransaction extends Model {
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
    walletId!: string;

    @Column({
        type: DataType.STRING,
        allowNull: true
    })
    toWalletId?: string;

    @Column({
        type: DataType.STRING, // "Credit" | "Debit" | "Transfer"
        allowNull: false
    })
    type!: string;

    @Column({
        type: DataType.DOUBLE,
        allowNull: false
    })
    amount!: number;

    @Column({
        type: DataType.STRING,
        allowNull: false
    })
    date!: string;

    @Column({
        type: DataType.STRING,
        allowNull: false
    })
    paymentMode!: string;

    @Column({
        type: DataType.STRING,
        allowNull: true
    })
    referenceNumber?: string;

    @Column({
        type: DataType.TEXT,
        allowNull: true
    })
    description?: string;

    @Column({
        type: DataType.STRING,
        allowNull: true
    })
    receiptUrl?: string;

    @CreatedAt
    createdAt!: Date;

    @UpdatedAt
    updatedAt!: Date;

    @BeforeValidate
    static async generateId(instance: WalletTransaction) {
        if (!instance.id) {
            const all = await WalletTransaction.findAll();
            let nextNum = 1;
            all.forEach(item => {
                const match = item.id.match(/^wt(\d+)$/);
                if (match) {
                    const num = parseInt(match[1], 10);
                    if (num >= nextNum) {
                        nextNum = num + 1;
                    }
                }
            });
            instance.id = `wt${nextNum}`;
        }
    }
}
