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
        type: DataType.STRING,
        allowNull: false
    })
    name!: string;

    @Column({
        type: DataType.STRING,
        allowNull: false
    })
    category!: string;

    @Column({
        type: DataType.STRING,
        allowNull: true
    })
    subCategory?: string;

    @Column({
        type: DataType.STRING,
        allowNull: false
    })
    status!: string;

    @Column({
        type: DataType.STRING,
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
        type: DataType.STRING,
        allowNull: false
    })
    brochureUrl!: string;

    @Column({
        type: DataType.BOOLEAN,
        allowNull: false,
        defaultValue: false
    })
    featured!: boolean;

    @Column(DataType.STRING)
    facing?: string;

    @Column(DataType.STRING)
    city?: string;

    @Column(DataType.STRING)
    microLocation?: string;

    @Column(DataType.INTEGER)
    floors?: number;

    @Column(DataType.INTEGER)
    unitsCount?: number;

    @Column(DataType.STRING)
    availabilityDetails?: string;

    @Column(DataType.STRING)
    specImage?: string;

    @Column(DataType.STRING)
    uds?: string;

    @Column(DataType.STRING)
    width?: string;

    @Column(DataType.STRING)
    length?: string;

    @Column(DataType.STRING)
    classification?: string;

    @Column({
        type: DataType.BOOLEAN,
        allowNull: true,
        defaultValue: true
    })
    isActive?: boolean;

    @Column(DataType.TEXT)
    remarks?: string;

    @Column(DataType.STRING)
    marketingResult?: string;

    @Column(DataType.STRING)
    agentId?: string;

    @Column({
        type: DataType.BOOLEAN,
        allowNull: false,
        defaultValue: false
    })
    isMarketing!: boolean;

    @CreatedAt
    createdAt!: Date;

    @UpdatedAt
    updatedAt!: Date;

    @BeforeValidate
    static async generateSequentialId(instance: Project) {
        const prefix = instance.isMarketing ? 'm' : 'p';
        const rawPrefix = instance.isMarketing ? 'm_' : 'p_';
        if (!instance.id || instance.id.startsWith(rawPrefix)) {
            const all = await Project.findAll({ where: { isMarketing: instance.isMarketing } });
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
