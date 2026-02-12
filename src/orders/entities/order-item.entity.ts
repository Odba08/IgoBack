import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Order } from './order.entity';
import { Product } from 'src/products/entities/product.entity';

@Entity('order_items')
export class OrderItem {

    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column('int')
    quantity: number;

    @Column('float')
    price: number; // El precio AL MOMENTO de la compra

    // Relación con el producto (para saber cuál es)
    @ManyToOne(() => Product, { eager: true })
    product: Product;

    // Relación con la orden padre
    @ManyToOne(() => Order, (order) => order.items, { onDelete: 'CASCADE' })
    order: Order;
}