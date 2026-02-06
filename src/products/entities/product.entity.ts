import { BeforeInsert, BeforeUpdate, Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { ProductImage } from './products-image.entity';
import { Category } from 'src/categories/entities/category.entity';
import { Business } from 'src/bussines/entities/bussines.entity';
// 1. IMPORTAR LA NUEVA ENTIDAD
import { MenuCategory } from 'src/menu-category/entities/menu-category.entity';


@Entity()
export class Product {

    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column('text')
    title: string;

    @Column('float', {
        default: 0
    })
    price: number;

    // --- NUEVAS COLUMNAS DE PROMOS ---
    @Column('bool', { default: false })
    isPromo: boolean; // ¿Es oferta?

    @Column('float', { default: 0 })
    discountPrice: number; // Precio rebajado (ej: antes 10, ahora 8)
    // ---------------------------------

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

    // --- RELACIONES ---

    // Relación Antigua Global (Ej: Categoría general). Se queda por compatibilidad.
    @ManyToOne(() => Category, (category) => category.products, { eager: true })
    category: Category;

    // RELACIÓN NUEVA: Sección del Menú (Ej: "Hamburguesas" dentro de McDonalds)
    @ManyToOne(() => MenuCategory, (category) => category.products)
    menuCategory: MenuCategory;

    // Relación Antigua Directa con Negocio. Se queda por compatibilidad.
    @ManyToOne(() => Business, (business) => business.products, { eager: true })
    @JoinColumn({ name: 'business_id' })
    business: Business;

    // Imágenes
    @OneToMany(
        () => ProductImage,
        (productImage) => productImage.product,
        { cascade: true, eager: true }
    )
    images?: ProductImage[];


    // --- EVENTOS (Slugs) ---

    @BeforeInsert()
    checkSlugInsert() {
        if (!this.slug) {
            this.slug = this.title;
        }

        // 1. Limpieza básica (minúsculas, espacios por guiones)
        this.slug = this.slug
            .toLowerCase()
            .replaceAll(' ', '_')
            .replaceAll("'", '');

        // 2. SOLUCIÓN AL ERROR DE DUPLICADOS:
        // Generamos un sufijo aleatorio corto (4 caracteres)
        // Ejemplo: si title es "Mancuernas", el slug será "mancuernas_ax9z"
        const uniqueSuffix = Math.random().toString(36).substring(2, 6);
        
        this.slug = `${this.slug}_${uniqueSuffix}`;
    }

    @BeforeUpdate()
    checkSlugUpdate() {
        // En update NO agregamos el random para no cambiar la URL cada vez que editas
        this.slug = this.slug
            .toLowerCase()
            .replaceAll(' ', '_')
            .replaceAll("'", '');
    }
}