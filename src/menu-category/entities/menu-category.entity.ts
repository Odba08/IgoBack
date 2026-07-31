import { Business } from "src/bussines/entities/bussines.entity";
import { Column, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { Product } from "src/products/entities/product.entity";

@Entity('menu_categories')
export class MenuCategory {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column('text')
    name: string; 

    @OneToMany(() => Product, (product) => product.menuCategory)
    products: Product[];

    @ManyToOne(() => Business, (business) => business.category, { onDelete: 'CASCADE' })
    business: Business;

}
