import { IsArray, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

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
}
