import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { validate as isUUID } from 'uuid';

import { Business } from './entities/bussines.entity';
import { BussinesImage } from './entities/bussines-image.entity';

// DTOS
import { CreateBusinessDto } from './dto/create-bussines.dto';
import { UpdateBusinessDto } from './dto/update-bussines.dto';
import { Product } from 'src/products/entities/product.entity';
import { ProductImage } from 'src/products/entities/products-image.entity';
import { PaginationDto } from 'src/common/dtos/pagination.dto';
import { CreateProductDto } from 'src/products/dto/create-product.dto';
import { UpdateProductDto } from 'src/products/dto/update-product.dto';

@Injectable()
export class BussinessService {
  private readonly logger = new Logger('BussinessService');

  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,

    @InjectRepository(Business)
    private readonly businessRepository: Repository<Business>,

    @InjectRepository(ProductImage)
    private readonly productImageRepository: Repository<ProductImage>,

    @InjectRepository(BussinesImage)
    private readonly businessImageRepository: Repository<BussinesImage>,

    private readonly dataSource: DataSource,
  ) {}

  // ================== BUSINESS ==================

  async createBusiness(createBusinessDto: CreateBusinessDto): Promise<Business> {
    const { images = [], ...businessDetails } = createBusinessDto;

    const business = this.businessRepository.create({
      ...businessDetails,
      images: images.map((url) =>
        this.businessImageRepository.create({ url }),
      ),
    });

    await this.businessRepository.save(business);
    return business;
  }
    
  async findAllBusiness(paginationDto: PaginationDto) {
    const { limit = 10, offset = 0 } = paginationDto;
    return this.businessRepository.find({
      take: limit,
      skip: offset,
      relations: { images: true },
    });
  }

  async findBusinessById(id: string): Promise<Business> {
    const business = await this.businessRepository.findOne({
      where: { id },
      relations: ['products', 'images', 'category'], // Agregué 'category' para que veas el cambio
    });
    if (!business) {
      throw new NotFoundException(`Business with id ${id} not found`);
    }
    return business;
  }

  // --- AQUÍ ESTÁ EL CAMBIO CLAVE ---
  async updateBusiness(
    id: string,
    updateBusinessDto: UpdateBusinessDto,
  ): Promise<Business> {
    
    // 1. Desestructuramos categoryId por separado
    const { images, categoryId, ...toUpdate } = updateBusinessDto;

    // 2. Preload fusiona los datos y convierte el ID en Relación
    const business = await this.businessRepository.preload({
      id,
      ...toUpdate,
      // Si viene categoryId, creamos el objeto que TypeORM necesita
      category: categoryId ? { id: categoryId } : undefined, 
    });

    if (!business) {
      throw new NotFoundException(`Business with id ${id} not found`);
    }

    // 3. Lógica de Imágenes (Se mantiene tu lógica de Transacción)
    if (images) {
      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();
      
      try {
        await queryRunner.manager.delete(BussinesImage, { bussines: { id } });
        
        business.images = images.map(url => 
            this.businessImageRepository.create({ url })
        );
        
        await queryRunner.manager.save(business);
        await queryRunner.commitTransaction();
      } catch (error) {
        await queryRunner.rollbackTransaction();
        this.handleDBExceptions(error);
      } finally {
        await queryRunner.release();
      }
    } else {
        // Si no hay imágenes, guardamos los cambios (incluyendo la categoría nueva)
        await this.businessRepository.save(business);
    }

    return this.findBusinessById(id);
  }

  async removeBusiness(id: string) {
    const business = await this.findBusinessById(id);
    await this.businessRepository.remove(business);
  }

  // ================== PRODUCTS dentro de BUSINESS ==================
  
  async createForBusiness(
    businessId: string,
    createProductDto: CreateProductDto,
  ) {
    const { images = [], ...productDetails } = createProductDto;

    const business = await this.businessRepository.findOne({
      where: { id: businessId },
    });
    if (!business) {
      throw new NotFoundException(`Business with id ${businessId} not found`);
    }

    const product = this.productRepository.create({
      ...productDetails,
      images: images.map((url) =>
        this.productImageRepository.create({ url }),
      ),
      business,
    });

    await this.productRepository.save(product);
    return { ...product, images };
  }

  async findAllForBusiness(
    businessId: string,
    paginationDto: PaginationDto,
  ) {
    const { limit = 10, offset = 0 } = paginationDto;

    const business = await this.findBusinessById(businessId);

    const products = await this.productRepository.find({
      where: { business: { id: business.id } },
      take: limit,
      skip: offset,
      relations: { images: true }
    });

    return products.map((product) => ({
      ...product,
      images: product.images.map((img) => img.url),
    }));
  }

  async findOneForBusiness(businessId: string, productId: string) {
    const product = await this.productRepository.findOne({
      where: { id: productId, business: { id: businessId } },
      relations: { images: true, business: true },
    });

    if (!product) {
      throw new NotFoundException(
        `Product with id ${productId} not found in business ${businessId}`,
      );
    }

    return {
      ...product,
      images: product.images.map((img) => img.url),
    };
  }

  async updateForBusiness(
    businessId: string,
    productId: string,
    updateProductDto: UpdateProductDto,
  ) {
    const { images, ...toUpdate } = updateProductDto;

    const product = await this.productRepository.findOne({
      where: { id: productId, business: { id: businessId } },
      relations: { images: true, business: true },
    });

    if (!product) {
      throw new NotFoundException(
        `Product with id ${productId} not found in business ${businessId}`,
      );
    }

    Object.assign(product, toUpdate);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      if (images) {
        await queryRunner.manager.delete(ProductImage, {
          product: { id: productId },
        });
        product.images = images.map((url) =>
          this.productImageRepository.create({ url }),
        );
      }

      await queryRunner.manager.save(product);
      await queryRunner.commitTransaction();
      await queryRunner.release();

      return this.findOneForBusiness(businessId, productId);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      await queryRunner.release();
      this.handleDBExceptions(error);
    }
  }

  async removeForBusiness(businessId: string, productId: string) {
    const product = await this.productRepository.findOne({
      where: { id: productId, business: { id: businessId } },
    });

    if (!product) {
      throw new NotFoundException(
        `Product with id ${productId} not found in business ${businessId}`,
      );
    }

    await this.productRepository.remove(product);
    return { message: `Product ${productId} removed successfully` };
  }

  // ================== UTILS ==================

  private handleDBExceptions(error: any) {
    if (error.code === '23505') {
      throw new BadRequestException(error.detail);
    }
    this.logger.error(error);
    throw new InternalServerErrorException(
      'Unexpected error, check server logs',
    );
  }
}