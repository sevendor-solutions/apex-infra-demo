import { Table, Column, Model, DataType, BeforeValidate, CreatedAt, UpdatedAt } from "sequelize-typescript";

@Table({ tableName: "cost_analyses" })
export class CostAnalysis extends Model {
    @Column({
        type: DataType.STRING,
        primaryKey: true,
        allowNull: false
    })
    id!: string;

    @Column({
        type: DataType.STRING,
        allowNull: true
    })
    projectId?: string;

    @Column({
        type: DataType.STRING,
        allowNull: false
    })
    projectName!: string;

    @Column({
        type: DataType.STRING,
        allowNull: true
    })
    location?: string;

    @Column({
        type: DataType.STRING,
        allowNull: true
    })
    date?: string;

    // Section 1: Land Cost
    @Column({ type: DataType.DOUBLE, allowNull: false, defaultValue: 0 })
    siteAreaSqYards!: number;

    @Column({ type: DataType.DOUBLE, allowNull: false, defaultValue: 0 })
    outRateCostPerSqYard!: number;

    @Column({ type: DataType.DOUBLE, allowNull: false, defaultValue: 0 })
    outRateCostTotal!: number;

    @Column({ type: DataType.DOUBLE, allowNull: false, defaultValue: 0 })
    govtMarketValuePerSqYard!: number;

    @Column({ type: DataType.DOUBLE, allowNull: true, defaultValue: 7.5 })
    registrationPercentage?: number;

    @Column({ type: DataType.DOUBLE, allowNull: false, defaultValue: 0 })
    registrationCost!: number;

    @Column({ type: DataType.DOUBLE, allowNull: true, defaultValue: 14 })
    lrsVudaPercentage?: number;

    @Column({ type: DataType.DOUBLE, allowNull: false, defaultValue: 0 })
    lrsVudaCost!: number;

    @Column({ type: DataType.DOUBLE, allowNull: false, defaultValue: 0 })
    totalLandCost!: number;

    // Section 2: TDR & Plan Approval
    @Column({ type: DataType.DOUBLE, allowNull: false, defaultValue: 0 })
    gvmcPlanApprovalCost!: number;

    @Column({ type: DataType.DOUBLE, allowNull: true, defaultValue: 1 })
    tdrPercentage?: number;

    @Column({ type: DataType.DOUBLE, allowNull: false, defaultValue: 0 })
    tdrAreaSft!: number;

    @Column({ type: DataType.DOUBLE, allowNull: false, defaultValue: 0 })
    tdrTotalCost!: number;

    @Column({ type: DataType.DOUBLE, allowNull: false, defaultValue: 0 })
    totalTdrPlanCost!: number;

    // Section 3: Construction Cost
    @Column({ type: DataType.DOUBLE, allowNull: false, defaultValue: 0 })
    totalFlatsAreaSft!: number;

    @Column({ type: DataType.DOUBLE, allowNull: false, defaultValue: 0 })
    constructionCostPerSft!: number;

    @Column({ type: DataType.DOUBLE, allowNull: false, defaultValue: 0 })
    totalConstructionCost!: number;

    // Share Breakdown Ratios
    @Column({ type: DataType.DOUBLE, allowNull: false, defaultValue: 40 })
    ownerSharePercent!: number;

    @Column({ type: DataType.DOUBLE, allowNull: false, defaultValue: 60 })
    builderSharePercent!: number;

    // Section 4: Total Project Cost
    @Column({ type: DataType.DOUBLE, allowNull: false, defaultValue: 0 })
    totalProjectCost!: number;

    // Section 5: Saluable Cost / Sales Realization
    @Column({ type: DataType.DOUBLE, allowNull: false, defaultValue: 0 })
    totalSaluableAreaSft!: number;

    @Column({ type: DataType.DOUBLE, allowNull: false, defaultValue: 0 })
    sellingPricePerSft!: number;

    @Column({ type: DataType.DOUBLE, allowNull: false, defaultValue: 0 })
    totalAreaSaluableCost!: number;

    @Column({ type: DataType.DOUBLE, allowNull: false, defaultValue: 0 })
    amenitiesCostPerUnit!: number;

    @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
    numberOfUnits!: number;

    @Column({ type: DataType.DOUBLE, allowNull: false, defaultValue: 0 })
    totalAmenitiesCost!: number;

    @Column({ type: DataType.DOUBLE, allowNull: false, defaultValue: 0 })
    totalSaleValue!: number;

    // Section 6: Unit Cost & Net Margin
    @Column({ type: DataType.DOUBLE, allowNull: false, defaultValue: 0 })
    costPerOneSft!: number;

    @Column({ type: DataType.DOUBLE, allowNull: false, defaultValue: 0 })
    netMarginTotal!: number;

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
    static async generateId(instance: CostAnalysis) {
        if (!instance.id) {
            instance.id = 'cost_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
        }
    }
}
