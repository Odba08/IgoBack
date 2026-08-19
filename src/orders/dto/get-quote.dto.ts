import { IsNumber, IsOptional, IsUUID, IsString, IsBoolean } from 'class-validator';

export class GetQuoteDto {
  @IsUUID()
  @IsOptional()
  businessId?: string;

  // Coordenadas opcionales del Punto A si se arrastra el pin morado
  @IsNumber()
  @IsOptional()
  pickupLat?: number;

  @IsNumber()
  @IsOptional()
  pickupLong?: number;

  // Coordenadas obligatorias del Punto B (Destino)
  @IsNumber()
  deliveryLat: number;

  @IsNumber()
  deliveryLong: number;

  @IsString()
  @IsOptional()
  shippingType?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsNumber()
  @IsOptional()
  packageValue?: number;

  @IsString()
  @IsOptional()
  packageSize?: string;

  @IsBoolean()
  @IsOptional()
  isInsured?: boolean;
}