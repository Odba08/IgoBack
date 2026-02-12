import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { Product } from 'src/products/entities/product.entity';
import { Business } from 'src/bussines/entities/bussines.entity';
import { HttpModule } from '@nestjs/axios'; 
@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderItem, Product, Business]),
    HttpModule
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
  
})
export class OrdersModule {}