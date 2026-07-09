import { Table, Column, Model, DataType, BeforeValidate, CreatedAt, UpdatedAt } from "sequelize-typescript";

@Table({ tableName: "stock_movements" })
export class StockMovement extends Model {
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
    productCode!: string;

    @Column({
        type: DataType.STRING, // "Stock In" | "Stock Out" | "Adjustment" | "Transfer"
        allowNull: false
    })
    type!: string;

    @Column({
        type: DataType.DOUBLE,
        allowNull: false
    })
    quantity!: number;

    @Column({
        type: DataType.STRING,
        allowNull: false
    })
    date!: string;

    @Column({
        type: DataType.STRING,
        allowNull: true
    })
    warehouse?: string;

    @Column({
        type: DataType.TEXT,
        allowNull: true
    })
    notes?: string;

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
    static async generateId(instance: StockMovement) {
        if (!instance.id) {
            const all = await StockMovement.findAll();
            let nextNum = 1;
            all.forEach(item => {
                const match = item.id.match(/^sm(\d+)$/);
                if (match) {
                    const num = parseInt(match[1], 10);
                    if (num >= nextNum) {
                        nextNum = num + 1;
                    }
                }
            });
            instance.id = `sm${nextNum}`;
        }
    }
}
