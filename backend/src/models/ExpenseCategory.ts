import { Table, Column, Model, DataType, BeforeValidate } from "sequelize-typescript";

@Table({ tableName: "expense_categories" })
export class ExpenseCategory extends Model {
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

    @BeforeValidate
    static autoId(instance: ExpenseCategory) {
        // Do nothing — ID is provided by the caller (ec1, ec2, ...)
    }
}
