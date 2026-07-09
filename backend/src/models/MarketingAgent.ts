import { Table, Column, Model, DataType, CreatedAt, UpdatedAt, BeforeValidate } from "sequelize-typescript";

@Table({ tableName: "marketing_agents" })
export class MarketingAgent extends Model {
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
        allowNull: true
    })
    phone?: string;

    @Column({
        type: DataType.STRING,
        allowNull: true
    })
    email?: string;

    @Column({
        type: DataType.STRING,
        allowNull: true
    })
    designation?: string;

    @Column({
        type: DataType.STRING,
        allowNull: true
    })
    photoUrl?: string;

    @Column({
        type: DataType.STRING,
        allowNull: false,
        defaultValue: "Active"
    })
    status!: string;

    @CreatedAt
    createdAt!: Date;

    @UpdatedAt
    updatedAt!: Date;

    @BeforeValidate
    static async generateSequentialId(instance: MarketingAgent) {
        if (!instance.id) {
            const all = await MarketingAgent.findAll();
            let nextNum = 1;
            all.forEach(item => {
                const match = item.id.match(/^ma(\d+)$/);
                if (match) {
                    const num = parseInt(match[1], 10);
                    if (num >= nextNum) {
                        nextNum = num + 1;
                    }
                }
            });
            instance.id = `ma${nextNum}`;
        }
    }
}

