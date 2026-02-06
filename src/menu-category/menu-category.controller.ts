import { Controller, Get, Post, Body, Patch, Param, Delete, ParseUUIDPipe } from '@nestjs/common';
import { MenuCategoryService } from './menu-category.service';
import { CreateMenuCategoryDto } from './dto/create-menu-category.dto';
import { UpdateMenuCategoryDto } from './dto/update-menu-category.dto';

@Controller('menu-category')
export class MenuCategoryController {
  constructor(private readonly menuCategoryService: MenuCategoryService) {}

  @Post()
  create(@Body() createMenuCategoryDto: CreateMenuCategoryDto) {
    return this.menuCategoryService.create(createMenuCategoryDto);
  }

  @Get()
  findAll() {
    return this.menuCategoryService.findAll();
  }

  @Get(':id')
  // Agregamos ParseUUIDPipe para validar que sea un ID válido
  findOne(@Param('id', ParseUUIDPipe) id: string) { 
    return this.menuCategoryService.findOne(id); // SIN EL +
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string, // SIN EL +
    @Body() updateMenuCategoryDto: UpdateMenuCategoryDto
  ) {
    return this.menuCategoryService.update(id, updateMenuCategoryDto); // SIN EL +
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) { // SIN EL +
    return this.menuCategoryService.remove(id); // SIN EL +
  }
}