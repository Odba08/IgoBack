import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CreateMenuCategoryDto } from './dto/create-menu-category.dto';
import { UpdateMenuCategoryDto } from './dto/update-menu-category.dto';

import { MenuCategory } from './entities/menu-category.entity';
import { Business } from 'src/bussines/entities/bussines.entity';

@Injectable()
export class MenuCategoryService {

  constructor(
    @InjectRepository(MenuCategory)
    private readonly menuCategoryRepository: Repository<MenuCategory>,

    @InjectRepository(Business)
    private readonly businessRepository: Repository<Business>,
  ) {}

  // CREAR UNA SECCIÓN DEL MENÚ
  async create(createMenuCategoryDto: CreateMenuCategoryDto) {
    const { businessId, ...details } = createMenuCategoryDto;

    // 1. Validar que el negocio existe
    const business = await this.businessRepository.findOneBy({ id: businessId });
    
    if (!business) {
      throw new NotFoundException(`Business with id ${businessId} not found`);
    }

    // 2. Crear la instancia
    const category = this.menuCategoryRepository.create({
      ...details,
      business: business, // Relacionamos con la entidad Business
    });

    // 3. Guardar
    return this.menuCategoryRepository.save(category);
  }

  // LISTAR TODAS (Opcional: Podrías filtrar por businessId si quisieras)
  findAll() {
    return this.menuCategoryRepository.find({
      relations: {
        business: true, // Para saber de qué negocio es cada una
      }
    });
  }

  // BUSCAR UNA POR ID
  async findOne(id: string) {
    const category = await this.menuCategoryRepository.findOne({
      where: { id },
      relations: { products: true } // Traemos los productos para ver qué hay dentro
    });

    if (!category) throw new NotFoundException(`Menu Category with id ${id} not found`);
    
    return category;
  }

  // ACTUALIZAR (Ej: Cambiar "Bebidas" por "Tragos")
  async update(id: string, updateMenuCategoryDto: UpdateMenuCategoryDto) {
    const category = await this.menuCategoryRepository.preload({
      id: id,
      ...updateMenuCategoryDto
    });

    if (!category) throw new NotFoundException(`Menu Category with id ${id} not found`);

    return this.menuCategoryRepository.save(category);
  }

  // ELIMINAR
  async remove(id: string) {
    const category = await this.findOne(id);
    await this.menuCategoryRepository.remove(category);
    return { message: `Category ${id} deleted` };
  }
}