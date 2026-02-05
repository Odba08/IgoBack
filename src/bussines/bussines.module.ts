import { TypeOrmModule } from '@nestjs/typeorm';
import { Module } from '@nestjs/common';
import { BussinessService } from './bussines.service';
import { BusinessController } from './bussines.controller';


import { Business } from './entities/bussines.entity';
import { BussinesImage } from './entities/bussines-image.entity';
import { Product } from 'src/products/entities/product.entity';
import { ProductImage } from 'src/products/entities/products-image.entity';

@Module({
  controllers: [BusinessController],
  providers: [BussinessService],
  imports: [TypeOrmModule.forFeature([Product, ProductImage, Business, Business, BussinesImage])],
})
export class BusinessModule {}
