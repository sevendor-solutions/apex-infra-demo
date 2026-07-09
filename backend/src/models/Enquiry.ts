import { Table, Column, Model, DataType, CreatedAt, UpdatedAt, BeforeValidate } from "sequelize-typescript";

@Table({ tableName: "enquiries" })
export class Enquiry extends Model {
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
        allowNull: false
    })
    email!: string;

    @Column({
        type: DataType.STRING,
        allowNull: false
    })
    phone!: string;

    @Column({
        type: DataType.TEXT,
        allowNull: false
    })
    message!: string;

    @Column({
        type: DataType.STRING,
        allowNull: true,
        defaultValue: "General"
    })
    projectAssociation?: string;

    @Column({
        type: DataType.STRING,
        allowNull: true
    })
    projectName?: string;

    @Column({
        type: DataType.STRING,
        allowNull: false
    })
    date!: string;

    @Column({
        type: DataType.ENUM("New", "In Progress", "Completed"),
        allowNull: false,
        defaultValue: "New"
    })
    status!: "New" | "In Progress" | "Completed";

    @Column({
        type: DataType.TEXT,
        allowNull: true
    })
    notes?: string;

    @CreatedAt
    createdAt!: Date;

    @UpdatedAt
    updatedAt!: Date;

    @BeforeValidate
    static async generateSequentialId(instance: Enquiry) {
        if (!instance.id || instance.id.startsWith('enq_') || instance.id.startsWith('e_')) {
            const all = await Enquiry.findAll();
            let nextNum = 1;
            all.forEach(item => {
                const match = item.id.match(/^e(\d+)$/);
                if (match) {
                    const num = parseInt(match[1], 10);
                    if (num < 100000 && num >= nextNum) {
                        nextNum = num + 1;
                    }
                }
            });
            instance.id = `e${nextNum}`;
        }
    }
}
