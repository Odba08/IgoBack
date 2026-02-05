import { BeforeInsert, BeforeUpdate, Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { ProductImage } from './products-image.entity';
import { Category } from 'src/categories/entities/category.entity';
import { Business } from 'src/bussines/entities/bussines.entity';


@Entity()
export class Product {

    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column('text', {
        unique: true,
    })
    title: string;

    @Column('float',{
        default: 0
    })
    price: number;

    @Column({
        type: 'text',
        nullable: true
    })
    description: string;

    @Column('text', {
        unique: true
    })
    slug: string;

    @Column('int', {
        default: 0
    })
    stock: number;

    @Column('text', { array: true, default: [], nullable: true }) 
    options: string[];

    @Column('text', {
        array: true,
        default: []
    })
    tags: string[];

    @BeforeInsert()
    checkSlugInsert() {

        if ( !this.slug ) {
            this.slug = this.title;
        }

        this.slug = this.slug
            .toLowerCase()
            .replaceAll(' ','_')
            .replaceAll("'",'')

    }

    @ManyToOne(() => Category, (category) => category.products, { eager: true })
    category: Category;

    @BeforeUpdate()
    checkSlugUpdate() {
        this.slug = this.slug
            .toLowerCase()
            .replaceAll(' ','_')
            .replaceAll("'",'')
    }


     // images

      @OneToMany(
        () => ProductImage,
        (productImage) => productImage.product,
        { cascade: true, eager: true } 
    )
    images?: ProductImage[];

    // Bussines
    @ManyToOne(() => Business, (business) => business.products, { eager: true })
    @JoinColumn({ name: 'business_id' }) // Nombre de la columna de relación
    business: Business
}
