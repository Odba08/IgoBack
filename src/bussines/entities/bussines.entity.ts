import { Entity, PrimaryGeneratedColumn, Column, OneToMany, ManyToOne } from 'typeorm';
import { BussinesImage } from './bussines-image.entity';
import { Category } from 'src/categories/entities/category.entity';
import { Product } from 'src/products/entities/product.entity';
// 1. IMPORTAR LA NUEVA ENTIDAD
import { MenuCategory } from 'src/menu-category/entities/menu-category.entity';
import { Order } from 'src/orders/entities/order.entity';

@Entity()
export class Business {

    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column('text', {
        unique: true,
    })
    name: string;

    @ManyToOne(() => Category, (category) => category.businesses, { eager: true })
    category: Category;

    @OneToMany(() => Product, (product) => product.business)
    products: Product[];

    @OneToMany(() => MenuCategory, (menuCategory) => menuCategory.business)
    menuCategories: MenuCategory[];

    @OneToMany(
        () => BussinesImage,
        (businessImage) => businessImage.bussines,
        { cascade: true, eager: true }
    )
    images?: BussinesImage[];

    @Column('float', { nullable: true })
    latitude: number;

    @Column('float', { nullable: true })
    longitude: number;

    
    @Column('text', { nullable: true })
    openTime: string; 

    @Column('text', { nullable: true })
    closeTime: string;

    @OneToMany(() => Order, (order) => order.business)
    orders: Order[];

}