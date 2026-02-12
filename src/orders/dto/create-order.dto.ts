import { IsArray, IsNumber, IsOptional, IsString, IsUUID, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

// Clase auxiliar para validar cada item del carrito
class OrderItemDto {
    @IsString()
    @IsUUID()
    productId: string;

    @IsNumber()
    quantity: number;
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