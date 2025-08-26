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

import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { PaginationDto } from 'src/common/dtos/pagination.dto';
import { Product } from './entities/product.entity';
import { ProductImage } from './entities/products-image.entity';
import { Business } from './entities/bussines.entity';
import { CreateBusinessDto } from './dto/create-bussines.dto';
import { UpdateBusinessDto } from './dto/update-bussines.dto';

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

    private readonly dataSource: DataSource, // Para transacciones
  ) {}

  // ================== BUSINESS ==================

  /* async createBusiness(createBusinessDto: CreateBusinessDto): Promise<Business> {
    const business = this.businessRepository.create(createBusinessDto);
    return this.businessRepository.save(business);
  }
 */

  async createBusiness(createBusinessDto: CreateBusinessDto): Promise<Business> {
    const { images = [], ...businessDetails } = createBusinessDto;

    const business = this.businessRepository.create({
      ...businessDetails,
      images: images.map((url) =>
        this.productImageRepository.create({ url }),
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
    });
  }

  async findBusinessById(id: string): Promise<Business> {
    const business = await this.businessRepository.findOne({
      where: { id },
      relations: ['products'],
    });
    if (!business) {
      throw new NotFoundException(`Business with id ${id} not found`);
    }
    return business;
  }

  async updateBusiness(
    id: string,
    updateBusinessDto: UpdateBusinessDto,
  ): Promise<Business> {
    const business = await this.businessRepository.preload({
      id,
      ...updateBusinessDto,
    });
    if (!business) {
      throw new NotFoundException(`Business with id ${id} not found`);
    }
    return this.businessRepository.save(business);
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

    // Transacción para imágenes
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
