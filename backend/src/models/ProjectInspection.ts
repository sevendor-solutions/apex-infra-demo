import { Table, Column, Model, DataType, BeforeValidate, CreatedAt, UpdatedAt } from "sequelize-typescript";

@Table({ tableName: "project_inspections" })
export class ProjectInspection extends Model {
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
    projectId!: string;

    @Column({
        type: DataType.STRING,
        allowNull: false
    })
    projectName!: string;

    @Column({
        type: DataType.STRING,
        allowNull: true,
        defaultValue: "JK Future Infra"
    })
    builderName!: string;

    @Column({
        type: DataType.TEXT,
        allowNull: false,
        get() {
            const raw = this.getDataValue("stages");
            return raw ? JSON.parse(raw) : [];
        },
        set(value) {
            this.setDataValue("stages", value ? JSON.stringify(value) : JSON.stringify([]));
        }
    })
    stages!: any[];

    @Column({
        type: DataType.DOUBLE,
        allowNull: false,
        defaultValue: 0
    })
    overallProgress!: number;

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
    static async generateId(instance: ProjectInspection) {
        if (!instance.id) {
            instance.id = "insp_" + (instance.projectId || Date.now());
        }
    }
}
