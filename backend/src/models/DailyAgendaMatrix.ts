import { Table, Column, Model, DataType, BeforeValidate, CreatedAt, UpdatedAt } from "sequelize-typescript";

@Table({ tableName: "daily_agenda_matrices" })
export class DailyAgendaMatrix extends Model {
    @Column({
        type: DataType.STRING,
        primaryKey: true,
        allowNull: false
    })
    id!: string;

    @Column({
        type: DataType.STRING,
        allowNull: false,
        defaultValue: "Daily Construction Follow-up Matrix"
    })
    title!: string;

    @Column({
        type: DataType.TEXT,
        allowNull: true,
        get() {
            const raw = this.getDataValue("columns");
            return raw ? JSON.parse(raw) : [];
        },
        set(value) {
            this.setDataValue("columns", value ? JSON.stringify(value) : JSON.stringify([]));
        }
    })
    columns!: Array<{ id: string; title: string; templateType?: string; defaultItems?: any[] }>;

    @Column({
        type: DataType.TEXT,
        allowNull: true,
        get() {
            const raw = this.getDataValue("rows");
            return raw ? JSON.parse(raw) : [];
        },
        set(value) {
            this.setDataValue("rows", value ? JSON.stringify(value) : JSON.stringify([]));
        }
    })
    rows!: Array<{ id: string; date: string; statusColor?: string; tasks: Record<string, string> }>;

    @Column({
        type: DataType.TEXT,
        allowNull: true,
        get() {
            const raw = this.getDataValue("cellChecklists");
            return raw ? JSON.parse(raw) : {};
        },
        set(value) {
            this.setDataValue("cellChecklists", value ? JSON.stringify(value) : JSON.stringify({}));
        }
    })
    cellChecklists!: Record<string, Array<{ id: string; title: string; completed: boolean; completedDate?: string }>>;

    @Column({
        type: DataType.TEXT,
        allowNull: true,
        get() {
            const raw = this.getDataValue("taskItems");
            return raw ? JSON.parse(raw) : [];
        },
        set(value) {
            this.setDataValue("taskItems", value ? JSON.stringify(value) : JSON.stringify([]));
        }
    })
    taskItems!: Array<{ id: string; colId: string; title: string; plannedDate: string; completedDate?: string; status: string }>;

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
    static async generateId(instance: DailyAgendaMatrix) {
        if (!instance.id) {
            instance.id = "matrix_" + Date.now();
        }
    }
}
