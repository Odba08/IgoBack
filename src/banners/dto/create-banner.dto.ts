import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { BannerActionType } from '../entities/banner.entity';

export class CreateBannerDto {
  @IsString()
  @MinLength(1)
  title: string;

  @IsString()
  @MinLength(5)
  imageUrl: string;

  @IsOptional()
  @IsIn(['NONE', 'EXTERNAL_URL', 'INFO_MODAL'])
  actionType?: BannerActionType;

  @IsOptional()
  @IsString()
  actionUrl?: string;

  @IsOptional()
  @IsString()
  infoTitle?: string;

  @IsOptional()
  @IsString()
  infoContent?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsInt()
  order?: number;
}
