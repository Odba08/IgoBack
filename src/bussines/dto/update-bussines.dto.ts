import { IsOptional, IsString, IsArray} from 'class-validator';

export class UpdateBusinessDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsArray()
  @IsOptional()
  @IsString({ each: true }) 
  images?: string[];
}
