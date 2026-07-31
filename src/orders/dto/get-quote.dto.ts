import { IsNumber, IsOptional, IsUUID, IsString } from 'class-validator';

export class GetQuoteDto {
  @IsUUID()
  businessId: string;

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
}