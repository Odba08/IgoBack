import { IsArray, IsInt, IsNumber, IsOptional, IsString, IsUUID, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

// Clase auxiliar para validar cada item del carrito
export class OrderItemDto {
  @IsUUID()
  productId: string;

  @IsInt()
  @Min(1)
  quantity: number;

  @IsString()
  selectedOptionsText: string; // Ej: "Medio, 2x Carne Adicional 150g"

  @IsNumber()
  @Min(0)
  finalUnitPrice: number; // El precio final de la unidad incluyendo sus extras
}

export class CreateOrderDto {

    @IsString()
    @IsUUID()
    businessId: string;

    // Validamos que sea un arreglo de objetos OrderItemDto
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => OrderItemDto)
    items: OrderItemDto[];

    // --- DATOS DEL CLIENTE Y ENTREGA ---
    @IsNumber()
    deliveryLat: number;

    @IsNumber()
    deliveryLong: number;

    @IsString()
    deliveryAddress: string;

    @IsString()
    @IsOptional()
    userIdTemp?: string; // ID temporal del usuario (hasta tener Auth)
}