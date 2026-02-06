import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class CreateMenuCategoryDto {
    
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsString()
    @IsUUID()
    @IsNotEmpty()
    businessId: string; // <--- ESTO ES LO QUE FALTABA
}