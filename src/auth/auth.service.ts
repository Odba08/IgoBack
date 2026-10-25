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


  private readonly resetCodeStore = new Map<string, { code: string; expires: number }>();

  async login(loginUserDto: LoginUserDto) {
    const { password, email } = loginUserDto;
    const cleanEmail = (email || '').toLowerCase().trim();

    const user = await this.usersService.findOneByEmail(cleanEmail);

    if (!user || !bcrypt.compareSync(password, user.password)) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        fullname: user.fullName,
        roles: user.roles,
        avatarUrl: user.avatarUrl,
        phoneNumber: user.phoneNumber,
        identityStatus: user.identityStatus,
      },
      token: this.jwtService.sign({ id: user.id }),
    };
  }

  async requestPasswordReset(rawEmail: string) {
    const email = (rawEmail || '').toLowerCase().trim();
    if (!email) {
      throw new UnauthorizedException('Email requerido');
    }

    const user = await this.usersService.findOneByEmail(email);
    if (!user) {
      // Respondemos éxito genérico por seguridad para evitar enumeración de correos
      return {
        success: true,
        message: 'Si el correo está registrado, se ha enviado un código de verificación.',
      };
    }

    // Generar código numérico de 6 dígitos
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = Date.now() + 15 * 60 * 1000; // 15 minutos

    this.resetCodeStore.set(email, { code, expires });

    console.log(`\n======================================================`);
    console.log(`🔐 CÓDIGO DE RECUPERACIÓN IGO PARA [${email}]: ${code}`);
    console.log(`======================================================\n`);

    return {
      success: true,
      message: 'Código de verificación generado y enviado a tu correo.',
      // En entorno de desarrollo incluimos el código para pruebas ágiles
      devCode: code,
    };
  }

  async resetPasswordWithCode(rawEmail: string, code: string, newPass: string) {
    const email = (rawEmail || '').toLowerCase().trim();
    if (!email || !code || !newPass) {
      throw new UnauthorizedException('Todos los campos son obligatorios');
    }

    if (newPass.length < 6) {
      throw new UnauthorizedException('La contraseña debe tener al menos 6 caracteres');
    }

    const record = this.resetCodeStore.get(email);
    if (!record || record.expires < Date.now()) {
      throw new UnauthorizedException('El código ha expirado o no es válido. Solicita uno nuevo.');
    }

    if (record.code !== code.trim()) {
      throw new UnauthorizedException('Código de verificación incorrecto');
    }

    const user = await this.usersService.findOneByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    // Actualizar contraseña
    const hashedPassword = bcrypt.hashSync(newPass, 10);
    await this.usersService.update(user.id, { password: hashedPassword } as any);

    // Limpiar código usado
    this.resetCodeStore.delete(email);

    return {
      success: true,
      message: '¡Contraseña restablecida correctamente! Ya puedes iniciar sesión.',
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
    } catch (error: any) {
      try {
        await queryRunner.rollbackTransaction();
      } catch (rbErr) {
        // ignore rollback error if already rolled back
      }
      console.error('Error during database reset & seed:', error);
      return {
        status: 'error',
        message: error.message || 'Error al resetear la base de datos',
        detail: error.detail || error.toString(),
      };
    } finally {
      try {
        await queryRunner.release();
      } catch (relErr) {
        // ignore release error
      }
    }
  }
}


