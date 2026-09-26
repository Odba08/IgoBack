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

    @Column('float', { default: 10.0 })
    commissionPercentage: number;

    @Column('text', { nullable: true })
    legalName?: string; // Nombre Jurídico / Razón Social

    @Column('text', { nullable: true })
    rif?: string; // RIF de la empresa (ej: J-12345678-0)

    @Column('text', { nullable: true })
    paymentBank?: string; // Banco para Pago Móvil (ej: 0102 Banco de Venezuela)

    @Column('text', { nullable: true })
    paymentPhone?: string; // Teléfono Pago Móvil

    @Column('text', { nullable: true })
    paymentId?: string; // C.I. o RIF Pago Móvil

    @Column('text', { nullable: true })
    paymentAccountName?: string; // Titular de la cuenta

    @Column('boolean', { default: true })
    isActive: boolean; // Estado activo / suspendido por deuda

    @Column('text', { nullable: true })
    ownerId: string;

    @OneToMany(() => Order, (order) => order.business)
    orders: Order[];

}