import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from 'src/users/users.service';
import { JwtService } from '@nestjs/jwt';
import { LoginUserDto } from './dto/login-user.dto';
import * as bcrypt from 'bcrypt';

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
      roles : user.roles},
      token : this.jwtService.sign({id : user.id})
    };
  }
}


