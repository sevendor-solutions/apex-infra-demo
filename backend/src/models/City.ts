import { Table, Column, Model, DataType, CreatedAt, UpdatedAt, HasMany, BeforeValidate } from "sequelize-typescript";
import { LocationMaster } from "./LocationMaster";

@Table({ tableName: "cities" })
export class City extends Model {
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

    @HasMany(() => LocationMaster)
    locations?: LocationMaster[];

    @CreatedAt
    createdAt!: Date;

    @UpdatedAt
    updatedAt!: Date;

    @BeforeValidate
    static async generateSequentialId(instance: City) {
        if (!instance.id || instance.id.startsWith('c_')) {
            const all = await City.findAll();
            let nextNum = 1;
            all.forEach(item => {
                const match = item.id.match(/^c(\d+)$/);
                if (match) {
                    const num = parseInt(match[1], 10);
                    if (num < 100000 && num >= nextNum) {
                        nextNum = num + 1;
                    }
                }
            });
            instance.id = `c${nextNum}`;
        }
    }
}
