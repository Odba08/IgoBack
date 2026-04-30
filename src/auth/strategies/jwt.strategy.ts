import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { InjectRepository } from "@nestjs/typeorm";
import { ExtractJwt, Strategy } from "passport-jwt";
import { User } from "src/users/entities/user.entity";
import { Repository } from "typeorm/repository/Repository";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy){
constructor(
  @InjectRepository(User) 
    private userRepository: Repository<User>,
    configService : ConfigService
){
    super({
        secretOrKey: configService.get('JWT_SECRET'),
        jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    })
}

async validate(payload: {id:string}) {
    const{id} = payload 
    const user = await this.userRepository.findOneBy({id})

    if (!user){
        throw new UnauthorizedException('token no valido')
    }

    if(!user.isActive){
        throw new UnauthorizedException('usuario no activo')
    }

    return user
}


}

