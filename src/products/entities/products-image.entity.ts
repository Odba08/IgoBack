import { Entity, Column, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Product } from './product.entity';

@Entity()
export class ProductImage {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column('text')
    url: string; 

    // Relación ManyToOne con Product
    @ManyToOne(
        () => Product,
        (product) => product.images,
        { onDelete: 'CASCADE' }
    )
    product: Product;
}