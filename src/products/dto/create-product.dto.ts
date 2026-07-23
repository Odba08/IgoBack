import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsInt, IsNumber, IsOptional, IsPositive, IsString, IsUUID, MinLength, Min, ValidateNested} from 'class-validator';

export class OptionChoiceDto{
    @IsString()
    name: string;

    @IsNumber()
    @Min(0)
    additionalPrice: number;
}

export class ProductOptionDto{
    @IsString()
    title: string;

    @IsBoolean()
    isRequired: boolean;

    @IsNumber()
    @Min(1)
    maxAllowed: number;

    // --- LA VARIABLE TÁCTICA QUE FALTA EN TU CÓDIGO ---
    @IsBoolean()
    @IsOptional()
    allowRepeated?: boolean;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => OptionChoiceDto)
    choices: OptionChoiceDto[];
}

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

    @IsString()
    @IsUUID()
    @IsOptional() 
    business_id?: string; 

    @IsBoolean()
    @IsOptional()
    isApproved?: boolean;

    @IsNumber()
    @IsOptional()
    weight?: number;

    @IsArray()
    @IsOptional()
    @ValidateNested({ each: true })
    @Type(() => ProductOptionDto)
    options?: ProductOptionDto[];
} 