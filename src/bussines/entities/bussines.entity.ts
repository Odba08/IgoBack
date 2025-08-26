import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Product } from './product.entity';
import { BussinesImage } from './bussines-image.entity';

@Entity()
export class Business {

  @PrimaryGeneratedColumn('uuid')
  id:string;

  @Column('text',{
    unique: true,
  })
  name: string;


  @OneToMany(() => Product, (product) => product.business)
  products: Product[];

  @OneToMany(
          () => BussinesImage,
          (businessImage) => businessImage.bussines,
          { cascade: true, eager: true } 
      )
      images?: BussinesImage[];

}