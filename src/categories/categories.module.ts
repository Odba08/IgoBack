import { Module } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CategoriesController } from './categories.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Category } from './entities/category.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Category]) // <--- ESTO ES LO QUE FALTA
  ],
  controllers: [CategoriesController],
  providers: [CategoriesService],
  exports: [TypeOrmModule] // Buena práctica exportarlo por si otro módulo lo necesita
})
export class CategoriesModule {}
