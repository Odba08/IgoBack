import { Entity, Column, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Product } from './product.entity';
import { Business } from './bussines.entity';

@Entity()
export class BussinesImage {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column('text')
    url: string; 

    // Relación ManyToOne con Product
    @ManyToOne(
        () => Business,
        (business) => business.images,
        { onDelete: 'CASCADE' }
    )
    bussines: Business;
}