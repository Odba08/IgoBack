import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(createUserDto: CreateUserDto) {
    try {
      // 1. Preparamos el objeto (TypeORM no lo guarda aún, solo lo arma)
      // La encriptación se hará sola gracias al @BeforeInsert de tu entidad
      const user = this.userRepository.create(createUserDto);

      // 2. Lo guardamos en PostgreSQL
      await this.userRepository.save(user);

      // 3. Removemos la contraseña encriptada antes de devolver la respuesta al frontend
      delete user.password;
      return user;

    } catch (error) {
      this.handleDBErrors(error);
    }
  }

  findAll() {
    return this.userRepository.find();
  }

  async findOne(id: string) {
    const user = await this.userRepository.findOneBy({ id });
    if (!user) throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    return user;
  }

  async findOneByEmail(email: string) {
    return this.userRepository.createQueryBuilder('user')
      .where('user.email = :email', { email })
      .addSelect('user.password') 
      .getOne(); 
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    const user = await this.userRepository.preload({
      id,
      ...updateUserDto,
    });

    if (!user) throw new NotFoundException(`Usuario con ID ${id} no encontrado`);

    try {
      await this.userRepository.save(user);
      delete user.password;
      return user;
    } catch (error) {
      this.handleDBErrors(error);
    }
  }

  // Método privado para centralizar errores
  private handleDBErrors(error: any): never {
    // 23505 es el código de error de PostgreSQL para "Unique Violation" (correo duplicado)
    if (error.code === '23505') {
      throw new BadRequestException('El correo ya está registrado en Igo');
    }
    
    console.log(error); // Solo para ver en consola del servidor
    throw new InternalServerErrorException('Error inesperado, revisa los logs');
  }
}