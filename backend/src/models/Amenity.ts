import { Table, Column, Model, DataType, CreatedAt, UpdatedAt, BeforeValidate } from "sequelize-typescript";

@Table({ tableName: "amenities" })
export class Amenity extends Model {
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
    static async generateSequentialId(instance: Amenity) {
        if (!instance.id || !instance.id.match(/^a\d+$/)) {
            const all = await Amenity.findAll();
            let nextNum = 1;
            all.forEach(item => {
                const match = item.id.match(/^a(\d+)$/);
                if (match) {
                    const num = parseInt(match[1], 10);
                    if (num < 100000 && num >= nextNum) {
                        nextNum = num + 1;
                    }
                }
            });
            instance.id = `a${nextNum}`;
        }
    }
}
