import { TypeOrmModule } from '@nestjs/typeorm';
import { Module } from '@nestjs/common';
import { BussinessService } from './bussines.service';
import { BusinessController } from './bussines.controller';

import { Product } from './entities/product.entity';
import { ProductImage } from './entities/products-image.entity';
import { Business } from './entities/bussines.entity';
import { BussinesImage } from './entities/bussines-image.entity';

@Module({
  controllers: [BusinessController],
  providers: [BussinessService],
  imports: [TypeOrmModule.forFeature([Product, ProductImage, Business, Business, BussinesImage])],
})
export class BusinessModule {}
