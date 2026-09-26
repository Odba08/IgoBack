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

    @IsNumber()
    @IsOptional()
    commissionPercentage?: number;

    @IsString()
    @IsOptional()
    legalName?: string;

    @IsString()
    @IsOptional()
    rif?: string;

    @IsString()
    @IsOptional()
    paymentBank?: string;

    @IsString()
    @IsOptional()
    paymentPhone?: string;

    @IsString()
    @IsOptional()
    paymentId?: string;

    @IsString()
    @IsOptional()
    paymentAccountName?: string;

    @IsOptional()
    isActive?: boolean;

    @IsString()
    @IsUUID()
    @IsOptional()
    ownerId?: string;
}
