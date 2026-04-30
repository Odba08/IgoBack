import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductsModule } from './products/products.module';
import { CommonModule } from './common/common.module';
import { FilesModule } from './files/files.module';
import { BusinessModule } from './bussines/bussines.module';
import { CategoriesModule } from './categories/categories.module';
import { MenuCategoryModule } from './menu-category/menu-category.module';
import { OrdersModule } from './orders/orders.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot(),

    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST,
      port: +process.env.DB_PORT,
      database: process.env.DB_NAME,
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,      
      autoLoadEntities: true,
      synchronize: true,
    }),

    ProductsModule,
    BusinessModule,
    FilesModule,
    CommonModule,
    CategoriesModule,
    MenuCategoryModule,
    OrdersModule,
    UsersModule,
    AuthModule,
  ],
})
export class AppModule {}
