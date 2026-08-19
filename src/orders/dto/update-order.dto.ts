import { IsBoolean, IsEnum, IsOptional, IsString, IsNumber } from 'class-validator';
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

  @IsOptional()
  deliveryUserId?: string | null;

  @IsString()
  @IsOptional()
  category?: string;

  @IsString()
  @IsOptional()
  shippingType?: string;

  @IsString()
  @IsOptional()
  paymentRecipient?: string;

  @IsString()
  @IsOptional()
  deliveryAddress?: string;

  @IsNumber()
  @IsOptional()
  deliveryLat?: number;

  @IsNumber()
  @IsOptional()
  deliveryLong?: number;

  @IsNumber()
  @IsOptional()
  totalItems?: number;

  @IsNumber()
  @IsOptional()
  deliveryFee?: number;

  @IsNumber()
  @IsOptional()
  totalAmount?: number;

  @IsString()
  @IsOptional()
  photoUrl?: string;

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