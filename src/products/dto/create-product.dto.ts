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
} 