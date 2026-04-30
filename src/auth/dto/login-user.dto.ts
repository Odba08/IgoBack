import { IsString, IsEmail, MinLength,  } from "class-validator";

export class LoginUserDto {


    @IsEmail()
    email: string;

    @IsString()
    @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
    password: string;
}