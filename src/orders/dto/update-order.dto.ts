import { IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { OrderStatus } from '../enums/order-status.enum';

export class UpdateOrderDto {
  @IsEnum(OrderStatus, {
    message: 'El estado proporcionado no pertenece al flujo logístico permitido (PENDING, PAID, PREPARING, READY, ON_WAY, DELIVERED, CANCELLED).'
  })
  @IsOptional()
  status?: OrderStatus;

  @IsBoolean()
  @IsOptional()
  isPaid?: boolean;
}