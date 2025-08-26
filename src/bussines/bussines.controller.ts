import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseUUIDPipe,
  Query,
} from '@nestjs/common';
import { BussinessService } from './bussines.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { PaginationDto } from './../common/dtos/pagination.dto';
import { CreateBusinessDto } from './dto/create-bussines.dto';
import { UpdateBusinessDto } from './dto/update-bussines.dto';

@Controller('business')
export class BusinessController {
  constructor(private readonly bussinessService: BussinessService) {}

  // ===================== BUSINESS CRUD =====================

  @Post()
  createBusiness(@Body() createBusinessDto: CreateBusinessDto) {
    return this.bussinessService.createBusiness(createBusinessDto);
  }

  @Get()
  findAllBusiness(@Query() paginationDto: PaginationDto) {
    return this.bussinessService.findAllBusiness(paginationDto);
  }

  @Get(':id')
  findBusinessById(@Param('id', ParseUUIDPipe) id: string) {
    return this.bussinessService.findBusinessById(id);
  }

  @Patch(':id')
  updateBusiness(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateBusinessDto: UpdateBusinessDto,
  ) {
    return this.bussinessService.updateBusiness(id, updateBusinessDto);
  }

  @Delete(':id')
  removeBusiness(@Param('id', ParseUUIDPipe) id: string) {
    return this.bussinessService.removeBusiness(id);
  }

  // ===================== PRODUCTS dentro de un BUSINESS =====================

  @Post(':businessId/products')
  createProduct(
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Body() createProductDto: CreateProductDto,
  ) {
    return this.bussinessService.createForBusiness(businessId, createProductDto);
  }

  @Get(':businessId/products')
  findAllProducts(
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Query() paginationDto: PaginationDto,
  ) {
    return this.bussinessService.findAllForBusiness(businessId, paginationDto);
  }

  @Get(':businessId/products/:productId')
  findOneProduct(
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Param('productId', ParseUUIDPipe) productId: string,
  ) {
    return this.bussinessService.findOneForBusiness(businessId, productId);
  }

  @Patch(':businessId/products/:productId')
  updateProduct(
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Param('productId', ParseUUIDPipe) productId: string,
    @Body() updateProductDto: UpdateProductDto,
  ) {
    return this.bussinessService.updateForBusiness(
      businessId,
      productId,
      updateProductDto,
    );
  }

  @Delete(':businessId/products/:productId')
  removeProduct(
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Param('productId', ParseUUIDPipe) productId: string,
  ) {
    return this.bussinessService.removeForBusiness(businessId, productId);
  }
}
