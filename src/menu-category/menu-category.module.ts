import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm'; // <--- IMPORTANTE
import { MenuCategoryService } from './menu-category.service';
import { MenuCategoryController } from './menu-category.controller';

import { MenuCategory } from './entities/menu-category.entity';
import { Business } from 'src/bussines/entities/bussines.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([MenuCategory, Business]) 
  ],
  controllers: [MenuCategoryController],
  providers: [MenuCategoryService],
})
export class MenuCategoryModule {}