import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Business } from 'src/bussines/entities/bussines.entity'; 
import { Product } from 'src/products/entities/product.entity';

@Entity('categories')
export class Category {
  
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('text', { unique: true })
  name: string; // Ej: "Hamburguesas", "Farmacia", "Tecnología"

  // Una categoría puede tener MUCHOS negocios
  @OneToMany(() => Business, (business) => business.category)
  businesses: Business[];

  // Una categoría puede tener MUCHOS productos
  @OneToMany(() => Product, (product) => product.category)
  products: Product[];
}