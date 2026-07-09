import { Table, Column, Model, DataType, BeforeValidate, CreatedAt, UpdatedAt } from "sequelize-typescript";

@Table({ tableName: "inventory_items" })
export class InventoryItem extends Model {
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
        allowNull: false,
        unique: true
    })
    code!: string;

    @Column({
        type: DataType.STRING,
        allowNull: true
    })
    category?: string;

    @Column({
        type: DataType.STRING,
        allowNull: true
    })
    brand?: string;

    @Column({
        type: DataType.STRING,
        allowNull: false,
        defaultValue: "Pcs"
    })
    unit!: string;

    @Column({
        type: DataType.DOUBLE,
        allowNull: false,
        defaultValue: 0
    })
    openingStock!: number;

    @Column({
        type: DataType.DOUBLE,
        allowNull: false,
        defaultValue: 0
    })
    purchasePrice!: number;

    @Column({
        type: DataType.DOUBLE,
        allowNull: false,
        defaultValue: 0
    })
    sellingPrice!: number;

    @Column({
        type: DataType.DOUBLE,
        allowNull: false,
        defaultValue: 0
    })
    gstPercentage!: number;

    @Column({
        type: DataType.DOUBLE,
        allowNull: false,
        defaultValue: 0
    })
    currentStock!: number;

    @Column({
        type: DataType.DOUBLE,
        allowNull: false,
        defaultValue: 0
    })
    minimumStockLevel!: number;

    @Column({
        type: DataType.STRING,
        allowNull: true
    })
    supplierName?: string;

    @Column({
        type: DataType.STRING,
        allowNull: true
    })
    warehouseLocation?: string;

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
    static async generateId(instance: InventoryItem) {
        if (!instance.id) {
            const all = await InventoryItem.findAll();
            let nextNum = 1;
            all.forEach(item => {
                const match = item.id.match(/^item(\d+)$/);
                if (match) {
                    const num = parseInt(match[1], 10);
                    if (num >= nextNum) {
                        nextNum = num + 1;
                    }
                }
            });
            instance.id = `item${nextNum}`;
        }
    }
}
