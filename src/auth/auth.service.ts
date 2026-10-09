import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from 'src/users/users.service';
import { JwtService } from '@nestjs/jwt';
import { LoginUserDto } from './dto/login-user.dto';
import * as bcrypt from 'bcrypt';
import axios from 'axios';
import * as crypto from 'crypto';
import { DataSource } from 'typeorm';
import { User } from 'src/users/entities/user.entity';
import { Category } from 'src/categories/entities/category.entity';

@Injectable()
export class AuthService {
 constructor(
  private readonly usersService: UsersService,
  private readonly jwtService: JwtService,
  private readonly dataSource: DataSource,
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

  async resetDatabaseAndSeedAdmin(body?: {
    adminEmail?: string;
    adminPassword?: string;
    adminFullName?: string;
  }) {
    const adminEmail = (body?.adminEmail || 'admin@igo.com').toLowerCase().trim();
    const adminPassword = body?.adminPassword || 'IgoAdmin2026!';
    const adminFullName = body?.adminFullName || 'Administrador IGO';

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Truncar de forma segura todas las tablas excepto categories y settings
      await queryRunner.query(`
        DO $$ DECLARE
          r RECORD;
        BEGIN
          FOR r IN (
            SELECT tablename 
            FROM pg_tables 
            WHERE schemaname = current_schema() 
              AND tablename NOT IN ('categories', 'settings', 'migrations', 'typeorm_metadata')
          ) LOOP
            EXECUTE 'TRUNCATE TABLE ' || quote_ident(r.tablename) || ' CASCADE';
          END LOOP;
        END $$;
      `);

      // 2. Garantizar categorías estándar de IGO
      const standardCategories = [
        'Restaurantes',
        'Supermercado',
        'Farmacia',
        'Mascotas',
        'Licores',
        'Express',
      ];

      for (const catName of standardCategories) {
        const existing = await queryRunner.manager.findOne(Category, {
          where: { name: catName },
        });
        if (!existing) {
          const newCat = queryRunner.manager.create(Category, { name: catName });
          await queryRunner.manager.save(newCat);
        }
      }

      // 3. Crear el Administrador Único de IGO
      const newAdmin = queryRunner.manager.create(User, {
        email: adminEmail,
        password: adminPassword,
        fullName: adminFullName,
        roles: ['admin'],
        isActive: true,
        employeeStatus: 'inactive',
      });
      const savedAdmin = await queryRunner.manager.save(newAdmin);

      await queryRunner.commitTransaction();

      const token = this.jwtService.sign({ id: savedAdmin.id });

      return {
        status: 'success',
        message: 'Base de datos en Neon / Render limpiada exitosamente. Negocios, productos y usuarios de prueba eliminados.',
        admin: {
          id: savedAdmin.id,
          email: savedAdmin.email,
          fullName: savedAdmin.fullName,
          roles: savedAdmin.roles,
        },
        credentials: {
          email: adminEmail,
          password: adminPassword,
        },
        token,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.error('Error during database reset & seed:', error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}


