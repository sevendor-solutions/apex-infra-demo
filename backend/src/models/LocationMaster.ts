import { Table, Column, Model, DataType, CreatedAt, UpdatedAt, ForeignKey, BelongsTo, BeforeValidate } from "sequelize-typescript";
import { City } from "./City";

@Table({ tableName: "locations" })
export class LocationMaster extends Model {
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

    @ForeignKey(() => City)
    @Column({
        type: DataType.STRING,
        allowNull: false
    })
    cityId!: string;

    @BelongsTo(() => City)
    city?: City;

    @CreatedAt
    createdAt!: Date;

    @UpdatedAt
    updatedAt!: Date;

    @BeforeValidate
    static async generateSequentialId(instance: LocationMaster) {
        if (!instance.id || instance.id.startsWith('l_') || instance.id.startsWith('loc_')) {
            const all = await LocationMaster.findAll();
            let nextNum = 1;
            all.forEach(item => {
                const match = item.id.match(/^loc(\d+)$/);
                if (match) {
                    const num = parseInt(match[1], 10);
                    if (num < 100000 && num >= nextNum) {
                        nextNum = num + 1;
                    }
                }
            });
            instance.id = `loc${nextNum}`;
        }
    }
}
