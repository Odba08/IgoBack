import { Controller, Get, Post, Body, Patch, Param, Delete, ParseUUIDPipe, Query } from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { PaginationDto } from './../common/dtos/pagination.dto';
import { CreateBusinessDto } from './dto/create-bussines.dto';
import { UpdateBusinessDto } from './dto/update-bussines.dto';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  create(@Body() createProductDto: CreateProductDto) {
    return this.productsService.create(createProductDto);
  }

   @Post('business')
  createBusiness(@Body() createBusinessDto: CreateBusinessDto) {
    return this.productsService.createBusiness(createBusinessDto);
  }

  @Get()
  findAll( @Query() paginationDto:PaginationDto ) {
    // console.log(paginationDto)
    return this.productsService.findAll( paginationDto );
  }

  @Get('business')
  findAllBusiness(@Query() paginationDto: PaginationDto){
    return this.productsService.findAllBusiness( paginationDto )
  }




  @Get(':term')
  findOne(@Param( 'term' ) term: string) {
    return this.productsService.findOne( term );
  }

   @Get('business/:id')
  findBusinessById(@Param('id', ParseUUIDPipe) id: string) {
    return this.productsService.findBusinessById(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe ) id: string, 
    @Body() updateProductDto: UpdateProductDto
  ) {
    return this.productsService.update( id, updateProductDto );
  }

  @Patch('business/:id')
  updateBusiness(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateBusinessDto: UpdateBusinessDto
  ) {
    return this.productsService.updateBusiness(id, updateBusinessDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe ) id: string) {
    return this.productsService.remove( id );
  }
}

