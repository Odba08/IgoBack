import { IsOptional, IsString, IsArray, IsUUID, IsNumber } from 'class-validator';

export class UpdateBusinessDto {
  
  @IsString()
  @IsOptional()
  name?: string;

  @IsArray()
  @IsOptional()
  @IsString({ each: true }) 
  images?: string[];

  @IsString()
  @IsUUID()
  @IsOptional()
  categoryId?: string;

  // --- LOS PASES DE ENTRADA QUE FALTABAN (FASE 2) ---

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

  @IsNumber()
  @IsOptional()
  commissionPercentage?: number;

  @IsString()
  @IsUUID()
  @IsOptional()
  ownerId?: string;
}