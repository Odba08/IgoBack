import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Product } from './product.entity';

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

}