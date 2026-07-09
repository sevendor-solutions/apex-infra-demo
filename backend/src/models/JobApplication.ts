import { Table, Column, Model, DataType, CreatedAt, UpdatedAt, BeforeValidate } from "sequelize-typescript";

@Table({ tableName: "job_applications" })
export class JobApplication extends Model {
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
        type: DataType.STRING,
        allowNull: false
    })
    position!: string;

    @Column({
        type: DataType.STRING,
        allowNull: false
    })
    experience!: string;

    @Column({
        type: DataType.TEXT,
        allowNull: true
    })
    coverLetter?: string;

    @Column({
        type: DataType.ENUM("Pending", "Interview Scheduled", "Shortlisted", "Rejected"),
        allowNull: false,
        defaultValue: "Pending"
    })
    status!: "Pending" | "Interview Scheduled" | "Shortlisted" | "Rejected";

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
    static async generateSequentialId(instance: JobApplication) {
        if (!instance.id || instance.id.startsWith('ja_') || instance.id.startsWith('app_')) {
            const all = await JobApplication.findAll();
            let nextNum = 1;
            all.forEach(item => {
                const match = item.id.match(/^ja(\d+)$/);
                if (match) {
                    const num = parseInt(match[1], 10);
                    if (num < 100000 && num >= nextNum) {
                        nextNum = num + 1;
                    }
                }
            });
            instance.id = `ja${nextNum}`;
        }
    }
}
