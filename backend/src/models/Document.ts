import { Table, Column, Model, DataType, CreatedAt, UpdatedAt, BeforeValidate } from "sequelize-typescript";

@Table({ tableName: "documents" })
export class Document extends Model {
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
        type: DataType.STRING,
        allowNull: false
    })
    fileUrl!: string;

    @Column({
        type: DataType.STRING,
        allowNull: false
    })
    fileType!: string;

    @Column({
        type: DataType.STRING,
        allowNull: true
    })
    projectAssociation?: string;

    @Column({
        type: DataType.STRING,
        allowNull: true
    })
    uploadedBy?: string;

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
    static async generateSequentialId(instance: Document) {
        if (!instance.id || instance.id.startsWith('d_')) {
            const all = await Document.findAll();
            let nextNum = 1;
            all.forEach(item => {
                const match = item.id.match(/^doc(\d+)$/);
                if (match) {
                    const num = parseInt(match[1], 10);
                    if (num < 100000 && num >= nextNum) {
                        nextNum = num + 1;
                    }
                }
            });
            instance.id = `doc${nextNum}`;
        }
    }
}
