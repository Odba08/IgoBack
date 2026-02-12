import { IsArray, IsNotEmpty, IsOptional, IsString, IsUUID, IsNumber } from 'class-validator';

export class CreateBusinessDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsUUID()
  categoryId: string;

  @IsString({ each: true })
  @IsArray()
  @IsOptional()
  images: string[];

    @IsNumber()
    @IsOptional()
    latitude?: number;

    @IsNumber()
    @IsOptional()
    longitude?: number;

    @IsString()
    @IsOptional()
    openTime?: string; 

    @IsString()
    @IsOptional()
    closeTime?: string;

    
}
