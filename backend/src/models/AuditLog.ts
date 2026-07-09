import { Table, Column, Model, DataType, CreatedAt } from "sequelize-typescript";

@Table({ tableName: "audit_logs" })
export class AuditLog extends Model {
    @Column({
        type: DataType.UUID,
        defaultValue: DataType.UUIDV4,
        primaryKey: true
    })
    id!: string;

    @Column({
        type: DataType.STRING,
        allowNull: false
    })
    user!: string;

    @Column({
        type: DataType.STRING,
        allowNull: false
    })
    role!: string;

    @Column({
        type: DataType.STRING,
        allowNull: false
    })
    action!: string;

    @Column({
        type: DataType.TEXT,
        allowNull: false
    })
    details!: string;

    @Column({
        type: DataType.STRING,
        allowNull: true
    })
    ip!: string;

    @Column({
        type: DataType.ENUM("Success", "Warning", "Failed"),
        allowNull: false,
        defaultValue: "Success"
    })
    status!: "Success" | "Warning" | "Failed";

    @CreatedAt
    createdAt!: Date;
}
