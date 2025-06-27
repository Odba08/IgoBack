import { IsOptional, IsString } from 'class-validator';

export class UpdateBusinessDto {
  @IsString()
  @IsOptional()
  name?: string;
}
