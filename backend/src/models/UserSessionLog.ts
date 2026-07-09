import { Table, Column, Model, DataType, CreatedAt } from "sequelize-typescript";

@Table({ tableName: "user_session_logs" })
export class UserSessionLog extends Model {
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
    userId!: string;

    @Column({
        type: DataType.STRING,
        allowNull: false
    })
    username!: string;

    @Column({
        type: DataType.STRING,
        allowNull: false
    })
    action!: "LOGIN" | "LOGOUT";

    @Column({
        type: DataType.STRING,
        allowNull: true
    })
    ipAddress!: string;

    @Column({
        type: DataType.STRING,
        allowNull: true
    })
    userAgent!: string;

    @Column({
        type: DataType.STRING,
        allowNull: true
    })
    device!: string;

    @CreatedAt
    createdAt!: Date;
}
