import { Table, Column, Model, DataType, CreatedAt, UpdatedAt, BeforeValidate } from "sequelize-typescript";

@Table({ tableName: "site_visits" })
export class SiteVisit extends Model {
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
    customerName!: string;

    @Column({
        type: DataType.STRING,
        allowNull: false
    })
    customerEmail!: string;

    @Column({
        type: DataType.STRING,
        allowNull: false
    })
    customerPhone!: string;

    @Column({
        type: DataType.STRING,
        allowNull: false
    })
    projectAssociation!: string; // Project/Marketing listing ID

    @Column({
        type: DataType.STRING,
        allowNull: false
    })
    projectName!: string; // Cached project name

    @Column({
        type: DataType.STRING, // YYYY-MM-DD
        allowNull: false
    })
    visitDate!: string;

    @Column({
        type: DataType.STRING, // HH:MM
        allowNull: false
    })
    visitTime!: string;

    @Column({
        type: DataType.ENUM("Pending", "Sent", "Failed", "Skipped"),
        allowNull: false,
        defaultValue: "Pending"
    })
    emailStatus!: "Pending" | "Sent" | "Failed" | "Skipped";

    @Column({
        type: DataType.STRING,
        allowNull: true
    })
    emailSentDate?: string;

    @Column({
        type: DataType.STRING,
        allowNull: true
    })
    assignedAgent?: string;

    @CreatedAt
    createdAt!: Date;

    @UpdatedAt
    updatedAt!: Date;

    @BeforeValidate
    static async generateSequentialId(instance: SiteVisit) {
        if (!instance.id) {
            const all = await SiteVisit.findAll();
            let nextNum = 1;
            all.forEach(item => {
                const match = item.id.match(/^sv(\d+)$/);
                if (match) {
                    const num = parseInt(match[1], 10);
                    if (num >= nextNum) {
                        nextNum = num + 1;
                    }
                }
            });
            instance.id = `sv${nextNum}`;
        }
    }
}
