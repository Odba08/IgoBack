import { IsOptional, IsString, IsArray, IsUUID} from 'class-validator';

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
}
