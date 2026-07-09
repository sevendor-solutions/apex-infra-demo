import { Table, Column, Model, DataType, CreatedAt, UpdatedAt, BeforeValidate } from "sequelize-typescript";

@Table({ tableName: "blogs" })
export class Blog extends Model {
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
        allowNull: false,
        unique: true
    })
    slug!: string;

    @Column({
        type: DataType.TEXT,
        allowNull: false
    })
    content!: string;

    @Column({
        type: DataType.TEXT,
        allowNull: false
    })
    summary!: string;

    @Column({
        type: DataType.STRING,
        allowNull: false
    })
    category!: string;

    @Column({
        type: DataType.STRING,
        allowNull: false
    })
    image!: string;

    @Column({
        type: DataType.STRING,
        allowNull: false
    })
    date!: string;

    @Column({
        type: DataType.STRING,
        allowNull: false
    })
    author!: string;

    @Column({
        type: DataType.TEXT,
        allowNull: false,
        get() {
            const rawValue = this.getDataValue('tags');
            return rawValue ? JSON.parse(rawValue) : [];
        },
        set(value) {
            this.setDataValue('tags', value ? JSON.stringify(value) : JSON.stringify([]));
        }
    })
    tags!: string[];

    @CreatedAt
    createdAt!: Date;

    @UpdatedAt
    updatedAt!: Date;

    @BeforeValidate
    static async generateSequentialId(instance: Blog) {
        if (!instance.id || instance.id.startsWith('b_')) {
            const all = await Blog.findAll();
            let nextNum = 1;
            all.forEach(item => {
                const match = item.id.match(/^b(\d+)$/);
                if (match) {
                    const num = parseInt(match[1], 10);
                    if (num < 100000 && num >= nextNum) {
                        nextNum = num + 1;
                    }
                }
            });
            instance.id = `b${nextNum}`;
        }
    }
}
