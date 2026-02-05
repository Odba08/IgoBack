import { Entity, PrimaryGeneratedColumn, Column, OneToMany, ManyToOne } from 'typeorm';
import { BussinesImage } from './bussines-image.entity';
import { Category } from 'src/categories/entities/category.entity';
import { Product } from 'src/products/entities/product.entity';

@Entity()
export class Business {

  @PrimaryGeneratedColumn('uuid')
  id:string;

  @Column('text',{
    unique: true,
  })
  name: string;

  @ManyToOne(() => Category, (category) => category.businesses, { eager: true })
    category: Category;

      @OneToMany(() => Product, (product) => product.business)
      products: Product[];
    
  @OneToMany(
          () => BussinesImage,
          (businessImage) => businessImage.bussines,
          { cascade: true, eager: true } 
      )
      images?: BussinesImage[];

}