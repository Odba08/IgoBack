import { Injectable, NotFoundException, Logger, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { Category } from './entities/category.entity';

@Injectable()
export class CategoriesService {

  private readonly logger = new Logger('CategoriesService');

  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
  ) {}

  async create(createCategoryDto: CreateCategoryDto) {
    try {
      const category = this.categoryRepository.create(createCategoryDto);
      await this.categoryRepository.save(category);
      return category;
    } catch (error) {
      this.handleDBExceptions(error);
    }
  }

  findAll() {
    return this.categoryRepository.find();
  }

  async findOne(id: string) {
    const category = await this.categoryRepository.findOneBy({ id });
    if (!category) {
      throw new NotFoundException(`Category with id ${id} not found`);
    }
    return category;
  }

  async update(id: string, updateCategoryDto: UpdateCategoryDto) {
    const category = await this.categoryRepository.preload({
      id: id,
      ...updateCategoryDto
    });

    if (!category) throw new NotFoundException(`Category with id: ${id} not found`);
    
    try {
      return await this.categoryRepository.save(category);
    } catch (error) {
      this.handleDBExceptions(error);
    }
  }

  async remove(id: string) {
    const category = await this.findOne(id);
    await this.categoryRepository.remove(category);
    return { message: `Category ${id} deleted` };
  }

  private handleDBExceptions(error: any) {
    this.logger.error(error);
    throw new InternalServerErrorException('Check server logs');
  }
}