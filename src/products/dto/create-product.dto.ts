import { IsArray, IsBoolean, IsInt, IsNumber, IsOptional, IsPositive, IsString, IsUUID, MinLength, Min} from 'class-validator';

export class CreateProductDto {

    @IsString()
    @MinLength(1)
    title: string;

    @IsNumber()
    @IsPositive()
    @IsOptional()
    price?: number;

    @IsString()
    @IsOptional()
    description?: string;

    @IsString()
    @IsOptional()
    slug?: string;

    @IsInt()
    @IsPositive()
    @IsOptional()
    stock?: number; 

    @IsString({ each: true })
    @IsArray()
    @IsOptional()
    tags: string[];

    @IsString({ each: true })
    @IsArray()
    @IsOptional()
    images?: string[];

    // --- CAMPOS DE PROMO Y MENÚ ---
    @IsBoolean()
    @IsOptional()
    isPromo?: boolean;

    @IsNumber()
    @Min(0)
    @IsOptional()
    discountPrice?: number;

    @IsString()
    @IsUUID()
    @IsOptional()
    menuCategoryId?: string; 

    // --- EL CAMPO QUE TE FALTA (SOLUCIÓN DEL ERROR) ---
    @IsString()
    @IsUUID()
    @IsOptional()
    business_id?: string; // <--- AGREGA ESTO
}