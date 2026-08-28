import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from 'src/users/users.service';
import { JwtService } from '@nestjs/jwt';
import { LoginUserDto } from './dto/login-user.dto';
import * as bcrypt from 'bcrypt';
import axios from 'axios';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
 constructor(
  private readonly usersService: UsersService,
  private readonly jwtService: JwtService
 ){}


async login (loginUserDto: LoginUserDto) {
  const {password, email} = loginUserDto;

  const user = await this.usersService.findOneByEmail(email);

  if (!user || !bcrypt.compareSync(password,user.password)){
    throw new UnauthorizedException('Invalid credentials');
  }

  return {
    user : {
      id : user.id,
      email : user.email,
      fullname : user.fullName,
      roles : user.roles,
      avatarUrl: user.avatarUrl
    },
    token : this.jwtService.sign({id : user.id})
  };
  }

  async googleLogin(token: string) {
    try {
      // 1. Verificar el token con Google
      const googleUrl = `https://oauth2.googleapis.com/tokeninfo?id_token=${token}`;
      const response = await axios.get(googleUrl);
      const { email, name, picture } = response.data;

      if (!email) {
        throw new UnauthorizedException('Token de Google inválido (sin email)');
      }

      // 2. Buscar si el usuario ya existe
      let user = await this.usersService.findOneByEmail(email);

      if (!user) {
        // 3. Si no existe, lo creamos
        // Generamos una contraseña segura aleatoria para satisfacer la restricción de BD
        const randomPassword = crypto.randomBytes(20).toString('hex');
        
        user = await this.usersService.create({
          email,
          fullName: name || email.split('@')[0],
          password: randomPassword,
          avatarUrl: picture || undefined,
          roles: ['client'],
        });
      }

      // 4. Firmar y retornar el token y el perfil
      return {
        user: {
          id: user.id,
          email: user.email,
          fullname: user.fullName,
          roles: user.roles,
          avatarUrl: user.avatarUrl,
        },
        token: this.jwtService.sign({ id: user.id }),
      };
    } catch (error) {
      console.error('Error in googleLogin:', error);
      throw new UnauthorizedException('Token de Google inválido o error en verificación');
    }
  }
}


