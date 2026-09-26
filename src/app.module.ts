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
import { SettingsModule } from './settings/settings.module';
import { NotificationsModule } from './notifications/notifications.module';
import { WebSocketsModule } from './websockets/websockets.module';

import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

@Module({
  imports: [
    ConfigModule.forRoot(),

    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000,
        limit: 15, // 15 req/s max
      },
      {
        name: 'long',
        ttl: 60000,
        limit: 300, // 300 req/min max
      },
    ]),

    TypeOrmModule.forRoot(
      process.env.DATABASE_URL
        ? {
            type: 'postgres',
            url: process.env.DATABASE_URL,
            autoLoadEntities: true,
            synchronize: true,
            ssl: { rejectUnauthorized: false },
          }
        : {
            type: 'postgres',
            host: process.env.DB_HOST,
            port: +process.env.DB_PORT,
            database: process.env.DB_NAME,
            username: process.env.DB_USERNAME,
            password: process.env.DB_PASSWORD,
            autoLoadEntities: true,
            synchronize: true,
            ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
          },
    ),

    ProductsModule,
    BusinessModule,
    FilesModule,
    CommonModule,
    CategoriesModule,
    MenuCategoryModule,
    OrdersModule,
    UsersModule,
    AuthModule,
    SettingsModule,
    NotificationsModule,
    WebSocketsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
