import { Table, Column, Model, DataType, CreatedAt, UpdatedAt, BeforeValidate } from "sequelize-typescript";

@Table({ tableName: "gallery_items" })
export class GalleryItem extends Model {
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
    title!: string;

    @Column({
        type: DataType.STRING,
        allowNull: false
    })
    category!: string;

    @Column({
        type: DataType.ENUM("image", "video"),
        allowNull: false
    })
    type!: "image" | "video";

    @Column({
        type: DataType.STRING,
        allowNull: false
    })
    url!: string;

    @Column({
        type: DataType.STRING,
        allowNull: true
    })
    thumbnail?: string;

    @Column({
        type: DataType.STRING,
        allowNull: true
    })
    projectAssociation?: string;

    @Column({
        type: DataType.STRING,
        allowNull: false
    })
    date!: string;

    @CreatedAt
    createdAt!: Date;

    @UpdatedAt
    updatedAt!: Date;

    @BeforeValidate
    static async generateSequentialId(instance: GalleryItem) {
        if (!instance.id || instance.id.startsWith('g_')) {
            const all = await GalleryItem.findAll();
            let nextNum = 1;
            all.forEach(item => {
                const match = item.id.match(/^g(\d+)$/);
                if (match) {
                    const num = parseInt(match[1], 10);
                    if (num < 100000 && num >= nextNum) {
                        nextNum = num + 1;
                    }
                }
            });
            instance.id = `g${nextNum}`;
        }
    }
}
