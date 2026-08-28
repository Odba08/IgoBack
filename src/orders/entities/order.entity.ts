import { Column, CreateDateColumn, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { OrderStatus } from '../enums/order-status.enum';
import { Business } from 'src/bussines/entities/bussines.entity';
import { User } from 'src/users/entities/user.entity';
import { OrderItem } from './order-item.entity';

@Entity('orders')
export class Order {

    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'int', generated: 'increment' })
    orderNumber: number;

    // --- RELACIÓN CON EL NEGOCIO (OBLIGATORIA PARA COMPRAS, OPCIONAL PARA ENVIOS/TAXI) ---
    @ManyToOne(() => Business, (business) => business.orders, { eager: true, nullable: true })
    business?: Business | null;

    // --- COORDENADAS Y DIRECCIÓN DE RECOGIDA (ORIGEN / PUNTO A) ---
    @Column('float', { nullable: true })
    pickupLat?: number;

    @Column('float', { nullable: true })
    pickupLong?: number;

    @Column('text', { nullable: true })
    pickupAddress?: string;

    // --- RELACIÓN CON EL USUARIO ---
    @ManyToOne(() => User, (user) => user.orders, { eager: true, nullable: true, onDelete: 'SET NULL' })
    user?: User | null;

    @ManyToOne(() => User, { eager: true, nullable: true, onDelete: 'SET NULL' })
    deliveryUser?: User | null;

    @Column('text', { nullable: true }) 
    userIdTemp: string;

    @Column('text', { default: 'Comida' })
    category: string; // 'Comida' | 'Mercado' | 'Compras' | 'Envíos' | 'Salud'

    @Column('text', { default: 'Moto' })
    shippingType: string; // 'Moto' | 'Carro' | 'Pickup'

    @Column('text', { default: 'Pago IGO' })
    paymentRecipient: string; // 'Pago Negocio' | 'Pago IGO' | 'Mix'

    // --- ESTADO DEL PEDIDO ---
    @Column({
        type: 'enum',
        enum: OrderStatus,
        default: OrderStatus.PENDING
    })
    status: OrderStatus;

    @Column('boolean', { default: false })
    isPaid: boolean;

    // --- INFORMACIÓN DE ENTREGA (GEOLOCALIZACIÓN) ---
    @Column('float', { nullable: true })
    deliveryLat: number;

    @Column('float', { nullable: true })
    deliveryLong: number;

    @Column('text')
    deliveryAddress: string;

    // --- MONTOS (LOGÍSTICA Y DINERO) ---
    @Column('float', { default: 0 })
    totalItems: number; // Suma de productos

    @Column('float', { default: 0 })
    deliveryFee: number; // Costo del envío calculado

    @Column('float', { default: 0 })
    totalAmount: number; // Total final (Items + Envío)

    // --- DETALLE DE PRODUCTOS ---
    @OneToMany(() => OrderItem, (orderItem) => orderItem.order, { cascade: true })
    items: OrderItem[];

    @Column('text', { nullable: true })
    photoUrl?: string;

    @Column('text', { nullable: true })
    paymentCaptureUrl?: string;

    @Column('timestamp without time zone', { nullable: true })
    acceptedAt?: Date;

    @Column('timestamp without time zone', { nullable: true })
    completedAt?: Date;

    @Column('float', { nullable: true })
    packageValue?: number;

    @Column('text', { nullable: true })
    packageSize?: string;

    @Column('boolean', { default: false })
    isInsured: boolean;

    // --- TIMESTAMPS ---
    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}