import { Table, Column, Model, DataType, CreatedAt, UpdatedAt } from "sequelize-typescript";

@Table({ tableName: "mail_configs" })
export class MailConfig extends Model {
    @Column({
        type: DataType.STRING,
        primaryKey: true,
        allowNull: false
    })
    id!: string; // e.g., 'default'

    @Column({
        type: DataType.ENUM("smtp", "simulation"),
        allowNull: false,
        defaultValue: "simulation"
    })
    deliveryMode!: "smtp" | "simulation";

    @Column({
        type: DataType.INTEGER,
        allowNull: false,
        defaultValue: 5
    })
    triggerWindowDays!: number; // e.g., scheduled within 5 days

    @Column({
        type: DataType.INTEGER,
        allowNull: false,
        defaultValue: 1
    })
    sendBeforeDays!: number; // e.g., send 1 day before

    @Column({
        type: DataType.STRING,
        allowNull: false,
        defaultValue: "smtp.mailtrap.io"
    })
    smtpHost!: string;

    @Column({
        type: DataType.INTEGER,
        allowNull: false,
        defaultValue: 2525
    })
    smtpPort!: number;

    @Column({
        type: DataType.STRING,
        allowNull: true,
        defaultValue: ""
    })
    smtpUser!: string;

    @Column({
        type: DataType.STRING,
        allowNull: true,
        defaultValue: ""
    })
    smtpPass!: string;

    @Column({
        type: DataType.STRING,
        allowNull: false,
        defaultValue: "noreply@jkfutureinfra.com"
    })
    senderEmail!: string;

    @Column({
        type: DataType.STRING,
        allowNull: false,
        defaultValue: "jkfutureinfra@gmail.com"
    })
    summaryEmail!: string;

    @Column({
        type: DataType.STRING,
        allowNull: false,
        defaultValue: "Reminder: Scheduled Site Visit for {projectName}"
    })
    emailSubject!: string;

    @Column({
        type: DataType.TEXT,
        allowNull: false,
        defaultValue: "Hello {customerName},\n\nThis is a friendly reminder that you have a scheduled site visit for {projectName} on {visitDate} at {visitTime}.\n\nLocation: {location}\n\nOur property consultant {assignedAgent} (Phone: {assignedAgentPhone}) will guide you.\n\nWarm regards,\nJK Future Infra Team"
    })
    emailTemplate!: string;

    // SMS Configurations
    @Column({
        type: DataType.STRING,
        allowNull: true,
        defaultValue: ""
    })
    smsProvider!: string;

    @Column({
        type: DataType.STRING,
        allowNull: true,
        defaultValue: ""
    })
    smsApiKey!: string;

    @Column({
        type: DataType.STRING,
        allowNull: true,
        defaultValue: ""
    })
    smsSenderId!: string;

    @Column({
        type: DataType.BOOLEAN,
        allowNull: false,
        defaultValue: false
    })
    smsEnabled!: boolean;

    // WhatsApp Configurations
    @Column({
        type: DataType.STRING,
        allowNull: true,
        defaultValue: ""
    })
    whatsappToken!: string;

    @Column({
        type: DataType.STRING,
        allowNull: true,
        defaultValue: ""
    })
    whatsappPhoneId!: string;

    @Column({
        type: DataType.BOOLEAN,
        allowNull: false,
        defaultValue: false
    })
    whatsappEnabled!: boolean;

    // Database Connection Cache Settings
    @Column({
        type: DataType.STRING,
        allowNull: true,
        defaultValue: "postgres"
    })
    dbType!: string;

    @Column({
        type: DataType.STRING,
        allowNull: true,
        defaultValue: ""
    })
    dbHost!: string;

    @Column({
        type: DataType.INTEGER,
        allowNull: true,
        defaultValue: 5432
    })
    dbPort!: number;

    @Column({
        type: DataType.STRING,
        allowNull: true,
        defaultValue: ""
    })
    dbUser!: string;

    @Column({
        type: DataType.STRING,
        allowNull: true,
        defaultValue: ""
    })
    dbPassword!: string;

    @Column({
        type: DataType.STRING,
        allowNull: true,
        defaultValue: ""
    })
    dbName!: string;

    // Security/JWT Settings
    @Column({
        type: DataType.STRING,
        allowNull: true,
        defaultValue: ""
    })
    jwtSecret!: string;

    // Facebook & Instagram Integration settings
    @Column({
        type: DataType.STRING,
        allowNull: true,
        defaultValue: "6159154908963"
    })
    facebookPageId!: string;

    @Column({
        type: DataType.TEXT,
        allowNull: true,
        defaultValue: ""
    })
    facebookPageAccessToken!: string;

    @Column({
        type: DataType.STRING,
        allowNull: true,
        defaultValue: ""
    })
    instagramAccountId!: string;

        @Column({
        type: DataType.STRING,
        allowNull: true
    })
    userId?: string;

    @CreatedAt
    createdAt!: Date;

    @UpdatedAt
    updatedAt!: Date;
}
