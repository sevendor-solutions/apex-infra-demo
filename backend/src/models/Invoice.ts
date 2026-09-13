import { Table, Column, Model, DataType, BeforeValidate, CreatedAt, UpdatedAt } from "sequelize-typescript";

@Table({ tableName: "invoices" })
export class Invoice extends Model {
    @Column({
        type: DataType.STRING,
        primaryKey: true,
        allowNull: false
    })
    id!: string;

    @Column({
        type: DataType.STRING,
        allowNull: false,
        unique: true
    })
    invoiceNumber!: string;

    @Column({
        type: DataType.STRING,
        allowNull: false
    })
    customerName!: string;

    @Column({
        type: DataType.STRING,
        allowNull: false
    })
    date!: string;

    @Column({
        type: DataType.TEXT,
        allowNull: false,
        get() {
            const rawValue = this.getDataValue('items');
            return rawValue ? JSON.parse(rawValue) : [];
        },
        set(value) {
            this.setDataValue('items', value ? JSON.stringify(value) : JSON.stringify([]));
        }
    })
    items!: Array<{
        productName: string;
        productCode: string;
        quantity: number;
        price: number;
        discount: number;
        gst: number;
        total: number;
    }>;

    @Column({
        type: DataType.DOUBLE,
        allowNull: false,
        defaultValue: 0
    })
    totalAmount!: number;

    @Column({
        type: DataType.DOUBLE,
        allowNull: false,
        defaultValue: 0
    })
    gstAmount!: number;

    @Column({
        type: DataType.DOUBLE,
        allowNull: false,
        defaultValue: 0
    })
    discountAmount!: number;

    @Column({
        type: DataType.DOUBLE,
        allowNull: false,
        defaultValue: 0
    })
    paidAmount!: number;

    @Column({
        type: DataType.DOUBLE,
        allowNull: false,
        defaultValue: 0
    })
    pendingAmount!: number;

    @Column({
        type: DataType.STRING, // "Paid" | "Partial" | "Unpaid"
        allowNull: false,
        defaultValue: "Unpaid"
    })
    paymentStatus!: string;

        @Column({
        type: DataType.STRING,
        allowNull: true
    })
    customerMobile?: string;

    @Column({
        type: DataType.STRING,
        allowNull: true
    })
    customerAddress?: string;

    @Column({
        type: DataType.STRING,
        allowNull: true
    })
    projectName?: string;

    @Column({
        type: DataType.TEXT,
        allowNull: true,
        get() {
            const rawValue = this.getDataValue('amenityItems');
            return rawValue ? JSON.parse(rawValue) : [];
        },
        set(value) {
            this.setDataValue('amenityItems', value ? JSON.stringify(value) : JSON.stringify([]));
        }
    })
    amenityItems?: Array<{
        productName: string;
        productCode: string;
        quantity: number;
        price: number;
        discount: number;
        gst: number;
        total: number;
    }>;

    @Column({
        type: DataType.TEXT,
        allowNull: true
    })
    notes?: string;

    @Column({
        type: DataType.TEXT,
        allowNull: true
    })
    termsAndConditions?: string;

    @Column({
        type: DataType.STRING,
        allowNull: true
    })
    quotationId?: string;

    @Column({
        type: DataType.STRING,
        allowNull: true
    })
    quotationNumber?: string;

    @Column({
        type: DataType.STRING,
        allowNull: true
    })
    userId?: string;

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
    static async generateId(instance: Invoice) {
        if (!instance.id) {
            const all = await Invoice.findAll();
            let nextNum = 1;
            all.forEach(item => {
                const match = item.id.match(/^inv(\d+)$/);
                if (match) {
                    const num = parseInt(match[1], 10);
                    if (num >= nextNum) {
                        nextNum = num + 1;
                    }
                }
            });
            instance.id = `inv${nextNum}`;
        }
    }
}
