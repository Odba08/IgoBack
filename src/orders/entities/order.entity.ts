import { Column, CreateDateColumn, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { OrderStatus } from '../enums/order-status.enum';
import { Business } from 'src/bussines/entities/bussines.entity';
// import { User } from 'src/auth/entities/user.entity'; // <-- DESCOMENTAR CUANDO TENGAMOS AUTH
import { OrderItem } from './order-item.entity';

@Entity('orders')
export class Order {

    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'int', generated: 'increment' })
    orderNumber: number;

    // --- RELACIÓN CON EL NEGOCIO (OBLIGATORIA) ---
    @ManyToOne(() => Business, (business) => business.orders, { eager: true })
    business: Business;

    // --- RELACIÓN CON EL USUARIO (PENDIENTE FASE AUTH) ---
    // @ManyToOne(() => User, (user) => user.orders)
    // user: User; 
    @Column('text', { nullable: true }) 
    userIdTemp: string; // <-- Placeholder temporal hasta que hagamos el Auth

    // --- ESTADO DEL PEDIDO ---
    @Column({
        type: 'enum',
        enum: OrderStatus,
        default: OrderStatus.PENDING
    })
    status: OrderStatus;

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

    // --- TIMESTAMPS ---
    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}