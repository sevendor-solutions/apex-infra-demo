import { Table, Column, Model, DataType, CreatedAt, UpdatedAt, BeforeValidate } from "sequelize-typescript";

export interface TimelineEvent {
  id: string;
  date: string;
  title: string;
  desc: string;
}

export interface FloorPlan {
  id: string;
  title: string;
  image: string;
}

@Table({ tableName: "projects" })
export class Project extends Model {
    @Column({
        type: DataType.STRING,
        primaryKey: true,
        allowNull: false
    })
    id!: string;

    @Column({
        type: DataType.TEXT,
        allowNull: false
    })
    name!: string;

    @Column({
        type: DataType.TEXT,
        allowNull: false
    })
    category!: string;

    @Column({
        type: DataType.TEXT,
        allowNull: true
    })
    subCategory?: string;

    @Column({
        type: DataType.TEXT,
        allowNull: false
    })
    status!: string;

    @Column({
        type: DataType.TEXT,
        allowNull: false
    })
    location!: string;

    @Column({
        type: DataType.TEXT,
        allowNull: false
    })
    description!: string;

    @Column({
        type: DataType.TEXT,
        allowNull: false,
        get() {
            const rawValue = this.getDataValue('images');
            return rawValue ? JSON.parse(rawValue) : [];
        },
        set(value) {
            this.setDataValue('images', value ? JSON.stringify(value) : JSON.stringify([]));
        }
    })
    images!: string[];

    @Column({
        type: DataType.TEXT,
        allowNull: true,
        get() {
            const rawValue = this.getDataValue('videos');
            return rawValue ? JSON.parse(rawValue) : [];
        },
        set(value) {
            this.setDataValue('videos', value ? JSON.stringify(value) : JSON.stringify([]));
        }
    })
    videos?: string[];

    @Column({
        type: DataType.TEXT,
        allowNull: false,
        get() {
            const rawValue = this.getDataValue('highlights');
            return rawValue ? JSON.parse(rawValue) : [];
        },
        set(value) {
            this.setDataValue('highlights', value ? JSON.stringify(value) : JSON.stringify([]));
        }
    })
    highlights!: string[];

    @Column({
        type: DataType.TEXT,
        allowNull: false,
        get() {
            const rawValue = this.getDataValue('timeline');
            return rawValue ? JSON.parse(rawValue) : [];
        },
        set(value) {
            this.setDataValue('timeline', value ? JSON.stringify(value) : JSON.stringify([]));
        }
    })
    timeline!: TimelineEvent[];

    @Column({
        type: DataType.TEXT,
        allowNull: false,
        get() {
            const rawValue = this.getDataValue('amenities');
            return rawValue ? JSON.parse(rawValue) : [];
        },
        set(value) {
            this.setDataValue('amenities', value ? JSON.stringify(value) : JSON.stringify([]));
        }
    })
    amenities!: string[];

    @Column({
        type: DataType.TEXT,
        allowNull: false,
        get() {
            const rawValue = this.getDataValue('floorPlans');
            return rawValue ? JSON.parse(rawValue) : [];
        },
        set(value) {
            this.setDataValue('floorPlans', value ? JSON.stringify(value) : JSON.stringify([]));
        }
    })
    floorPlans!: FloorPlan[];

    @Column({
        type: DataType.STRING,
        allowNull: false
    })
    priceRange!: string;

    @Column({
        type: DataType.BIGINT,
        allowNull: false,
        get() {
            const val = this.getDataValue('priceValue');
            return val ? Number(val) : 0;
        }
    })
    priceValue!: number;

    @Column({
        type: DataType.TEXT,
        allowNull: false,
        get() {
            const rawValue = this.getDataValue('paymentPlans');
            return rawValue ? JSON.parse(rawValue) : [];
        },
        set(value) {
            this.setDataValue('paymentPlans', value ? JSON.stringify(value) : JSON.stringify([]));
        }
    })
    paymentPlans!: string[];

    @Column({
        type: DataType.TEXT,
        allowNull: false,
        get() {
            const rawValue = this.getDataValue('mapCoordinates');
            return rawValue ? JSON.parse(rawValue) : { lat: 0, lng: 0 };
        },
        set(value) {
            this.setDataValue('mapCoordinates', value ? JSON.stringify(value) : JSON.stringify({ lat: 0, lng: 0 }));
        }
    })
    mapCoordinates!: {
        lat: number;
        lng: number;
    };

    @Column({
        type: DataType.TEXT,
        allowNull: false
    })
    brochureUrl!: string;

    @Column({
        type: DataType.BOOLEAN,
        allowNull: false,
        defaultValue: false
    })
    featured!: boolean;

    @Column(DataType.TEXT)
    facing?: string;

    @Column(DataType.TEXT)
    city?: string;

    @Column(DataType.TEXT)
    microLocation?: string;

    @Column(DataType.INTEGER)
    floors?: number;

    @Column(DataType.INTEGER)
    unitsCount?: number;

    @Column(DataType.TEXT)
    availabilityDetails?: string;

    @Column(DataType.TEXT)
    specImage?: string;

    @Column(DataType.TEXT)
    uds?: string;

    @Column(DataType.TEXT)
    width?: string;

    @Column(DataType.TEXT)
    length?: string;

    @Column(DataType.TEXT)
    classification?: string;

    @Column({
        type: DataType.BOOLEAN,
        allowNull: true,
        defaultValue: true
    })
    isActive?: boolean;

    @Column(DataType.TEXT)
    remarks?: string;

    @Column(DataType.TEXT)
    marketingResult?: string;

    @Column(DataType.STRING)
    agentId?: string;

    @Column(DataType.STRING)
    referredByName?: string;

    @Column(DataType.STRING)
    referredByPhone?: string;

    @Column(DataType.TEXT)
    referredRemarks?: string;

    @Column({
        type: DataType.BOOLEAN,
        allowNull: false,
        defaultValue: false
    })
    isMarketing!: boolean;

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
    static async generateSequentialId(instance: Project) {
        const prefix = instance.isMarketing ? 'm' : 'p';
        const rawPrefix = instance.isMarketing ? 'm_' : 'p_';
        if (!instance.id || instance.id.startsWith(rawPrefix)) {
            const all = await Project.findAll({
                where: { isMarketing: instance.isMarketing },
                attributes: ['id']
            });
            let nextNum = 1;
            all.forEach(item => {
                const regex = new RegExp(`^${prefix}(\\d+)$`);
                const match = item.id.match(regex);
                if (match) {
                    const num = parseInt(match[1], 10);
                    if (num < 100000 && num >= nextNum) {
                        nextNum = num + 1;
                    }
                }
            });
            instance.id = `${prefix}${nextNum}`;
        }
    }
}
