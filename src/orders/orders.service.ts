import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';

import { CreateOrderDto } from './dto/create-order.dto';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { Product } from 'src/products/entities/product.entity';
import { Business } from 'src/bussines/entities/bussines.entity';

import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class OrdersService {

  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,

    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>,

    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,

    @InjectRepository(Business)
    private readonly businessRepository: Repository<Business>,

    private readonly dataSource: DataSource,
    private readonly httpService: HttpService, 
  ) {}

  async create(createOrderDto: CreateOrderDto) {
    const { items, businessId, deliveryLat, deliveryLong, deliveryAddress, userIdTemp } = createOrderDto;

    // 1. Validar existencia del Negocio
    const business = await this.businessRepository.findOne({ where: { id: businessId } });
    if (!business) throw new NotFoundException(`Negocio ${businessId} no encontrado`);

    // 2. Calcular Ruta Real (Distancia + Geometría de calles)
    const routeData = await this.calculateRouteData(
        business.latitude, business.longitude, 
        deliveryLat, deliveryLong
    );

    // 3. Calcular Precio del Delivery basado en la distancia vial
    const deliveryFee = this.calculateDeliveryFee(routeData.distance);

    // 4. Procesar Productos y Stock con Transacción
    let totalItemsPrice = 0;
    const orderItems: OrderItem[] = [];

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
        for (const itemDto of items) {
            const product = await this.productRepository.findOne({ where: { id: itemDto.productId } });
            
            if (!product) throw new NotFoundException(`Producto ${itemDto.productId} no existe`);
            if (product.stock < itemDto.quantity) throw new BadRequestException(`Stock insuficiente para ${product.title}`);

            const orderItem = this.orderItemRepository.create({
                quantity: itemDto.quantity,
                price: product.isPromo ? product.discountPrice : product.price,
                product: product
            });
            orderItems.push(orderItem);

            totalItemsPrice += (orderItem.price * itemDto.quantity);

            // Descuento de stock
            product.stock -= itemDto.quantity;
            await queryRunner.manager.save(product);
        }

        // 5. Crear la Orden Maestra en BD
        const order = this.orderRepository.create({
            business,
            deliveryAddress,
            deliveryLat,
            deliveryLong,
            userIdTemp,
            items: orderItems,
            totalItems: totalItemsPrice,
            deliveryFee: deliveryFee,
            totalAmount: totalItemsPrice + deliveryFee
        });

        await queryRunner.manager.save(order);
        await queryRunner.commitTransaction();

        // 6. Respuesta enriquecida para el Frontend
        return { 
            orderId: order.id,
            status: 'CREATED',
            totalToPay: order.totalAmount,
            distance: `${routeData.distance.toFixed(2)} km`,
            routePolyline: routeData.points, // <--- Lista de puntos para dibujar las calles
            businessLocation: { 
                latitude: business.latitude, 
                longitude: business.longitude 
            },
            message: 'Orden creada exitosamente.' 
        };

    } catch (error) {
        await queryRunner.rollbackTransaction();
        throw error;
    } finally {
        await queryRunner.release();
    }
  }

  // --- MOTOR DE RUTAS (OSRM con Geometría) ---

  private async calculateRouteData(lat1: number, lon1: number, lat2: number, lon2: number) {
    try {
      // Solicitamos geometries=geojson para obtener todos los puntos del camino
      const url = `http://router.project-osrm.org/route/v1/driving/${lon1},${lat1};${lon2},${lat2}?overview=full&geometries=geojson`;

      const { data } = await firstValueFrom(this.httpService.get(url));

      if (!data.routes || data.routes.length === 0) {
        throw new Error('Ruta no encontrada');
      }

      const route = data.routes[0];
      
      // Mapeamos las coordenadas de OSRM [long, lat] al formato de Google Maps {latitude, longitude}
      const points = route.geometry.coordinates.map((coord: number[]) => ({
        latitude: coord[1],
        longitude: coord[0]
      }));

      return {
        distance: parseFloat((route.distance / 1000).toFixed(2)),
        points: points
      };

    } catch (error) {
      console.warn('Fallo OSRM, usando respaldo lineal:', error.message);
      // Respaldo matemático si el servicio externo falla
      const fallbackDist = this.calculateHaversine(lat1, lon1, lat2, lon2);
      return {
        distance: parseFloat((fallbackDist * 1.2).toFixed(2)), // +20% compensación
        points: [
          { latitude: lat1, longitude: lon1 },
          { latitude: lat2, longitude: lon2 }
        ]
      };
    }
  }

  private calculateHaversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private calculateDeliveryFee(distanceKm: number): number {
    const BASE_FEE = 3.00;
    const FREE_KM_LIMIT = 3;
    const PRICE_PER_KM = 1.00;

    let fee = BASE_FEE;
    if (distanceKm > FREE_KM_LIMIT) {
        fee += (distanceKm - FREE_KM_LIMIT) * PRICE_PER_KM;
    }

    // Recargo nocturno (22:00 - 06:00)
    const hour = new Date().getHours();
    if (hour >= 22 || hour < 6) fee *= 1.5;

    return parseFloat(fee.toFixed(2));
  }

  // --- MÉTODOS ESTÁNDAR ---

  findAll() {
    return this.orderRepository.find({ 
        order: { createdAt: 'DESC' },
        relations: ['items', 'business']
    });
  }

  async update(id: string, updateOrderDto: any) {
    const order = await this.orderRepository.findOne({ where: { id } });
    if (!order) throw new NotFoundException(`Orden ${id} no encontrada`);
    if (updateOrderDto.status) order.status = updateOrderDto.status;
    return this.orderRepository.save(order);
  }

  async remove(id: string) {
    const order = await this.orderRepository.findOne({ where: { id } });
    if (!order) throw new NotFoundException(`Orden ${id} no encontrada`);
    return this.orderRepository.remove(order);
  }

  findOne(id: string) {
    return `This action returns a #${id} order`;
  }

}