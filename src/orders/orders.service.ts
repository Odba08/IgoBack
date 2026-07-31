import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, IsNull } from 'typeorm';

import { CreateOrderDto } from './dto/create-order.dto';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { Product } from 'src/products/entities/product.entity';
import { Business } from 'src/bussines/entities/bussines.entity';
import { User } from 'src/users/entities/user.entity';

import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { UpdateOrderDto } from './dto/update-order.dto';
import { GetQuoteDto } from './dto/get-quote.dto';

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

    @InjectRepository(User)
    private readonly userRepository: Repository<User>,

    private readonly dataSource: DataSource,
    private readonly httpService: HttpService, 
  ) {}

  async create(createOrderDto: CreateOrderDto, user?: User) {
    // ⚡ 1. Extraemos las nuevas variables de recogida
    const { items, businessId, deliveryLat, deliveryLong, deliveryAddress, userIdTemp, pickupLat, pickupLong, category, shippingType, paymentRecipient } = createOrderDto;

    const business = await this.businessRepository.findOne({ where: { id: businessId } });
    if (!business) throw new NotFoundException(`Negocio ${businessId} no encontrado`);

    // ⚡ 2. DETERMINACIÓN DEL PUNTO A: Priorizamos el mapa del usuario sobre la base de datos
    const startLat = pickupLat ? pickupLat : business.latitude;
    const startLng = pickupLong ? pickupLong : business.longitude;

    // 3. Calcular Ruta Real con las coordenadas definitivas
    const routeData = await this.calculateRouteData(
        startLat, startLng, 
        deliveryLat, deliveryLong
    );

    const deliveryFee = this.calculateDeliveryFee(routeData.distance, shippingType || 'Moto');

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
                price: itemDto.finalUnitPrice,
                selectedOptionsText: itemDto.selectedOptionsText || 'Sin adicionales',
                product: product
            });
            orderItems.push(orderItem);

            totalItemsPrice += (orderItem.price * itemDto.quantity);

            product.stock -= itemDto.quantity;
            await queryRunner.manager.save(product);
        }

        // Autodetectar la categoría de pedido a partir del negocio (SIEMPRE se sobreescribe desde el negocio para evitar que los usuarios la falseen)
        let finalCategory = 'Compras';
        if (business.category) {
          const catName = business.category.name.toLowerCase();
          if (catName.includes('comida') || catName.includes('hamburguesa') || catName.includes('restaurante') || catName.includes('pizza') || catName.includes('sushi') || catName.includes('cafe')) {
            finalCategory = 'Comida';
          } else if (catName.includes('farmacia') || catName.includes('salud') || catName.includes('medica')) {
            finalCategory = 'Salud';
          } else if (catName.includes('supermercado') || catName.includes('mercado') || catName.includes('bodega')) {
            finalCategory = 'Mercado';
          } else if (catName.includes('envio') || catName.includes('delivery') || catName.includes('mensajeria')) {
            finalCategory = 'Envíos';
          }
        }

        const order = this.orderRepository.create({
            business,
            user: user || null,
            deliveryAddress,
            deliveryLat,
            deliveryLong,
            userIdTemp,
            items: orderItems,
            totalItems: totalItemsPrice,
            deliveryFee: deliveryFee,
            totalAmount: totalItemsPrice + deliveryFee,
            category: finalCategory,
            shippingType: shippingType || 'Moto',
            paymentRecipient: paymentRecipient || 'Pago IGO'
        });

        await queryRunner.manager.save(order);
        await queryRunner.commitTransaction();

       return { 
            orderId: String(order.orderNumber).padStart(4, '0'), 
            
            status: 'CREATED',
            totalToPay: order.totalAmount,
            distance: `${routeData.distance.toFixed(2)} km`,
            routePolyline: routeData.points, 
            businessLocation: { 
                latitude: startLat, 
                longitude: startLng 
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

  // Coloca esta función dentro de la clase OrdersService (por ejemplo, arriba del método create)

  async getRouteQuote(getQuoteDto: GetQuoteDto) {
    const { businessId, pickupLat, pickupLong, deliveryLat, deliveryLong, shippingType } = getQuoteDto;

    let startLat = pickupLat;
    let startLng = pickupLong;

    // ⚡ BIFURCACIÓN LÓGICA: Si NO es un cálculo libre, validamos contra la Base de Datos
    if (businessId && businessId !== '00000000-0000-0000-0000-000000000000') {
      const business = await this.businessRepository.findOne({ where: { id: businessId } });
      if (!business) throw new NotFoundException(`Negocio ${businessId} no encontrado`);
      
      // Si no enviaron coordenadas desde el mapa, usamos las del local
      if (!startLat) startLat = business.latitude;
      if (!startLng) startLng = business.longitude;
    }

    // 🛡️ BARRERA DE SEGURIDAD: Garantizar que tenemos un Punto A para el cálculo
    if (!startLat || !startLng) {
      throw new BadRequestException('Se requiere un punto de origen válido para calcular la ruta.');
    }

    // 3. Consultar la geometría de calles a OSRM
    const routeData = await this.calculateRouteData(
      startLat, startLng,
      deliveryLat, deliveryLong
    );

    // 4. Calcular tarifa vial aplicando reglas financieras
    const deliveryFee = this.calculateDeliveryFee(routeData.distance, shippingType || 'Moto');

    // 5. Retornar payload puro de telemetría (Cero inserciones en Base de Datos)
    return {
      status: 'QUOTE_GENERATED',
      distance: `${routeData.distance.toFixed(2)} km`,
      deliveryFee: deliveryFee,
      routePolyline: routeData.points, 
      businessLocation: {
        latitude: startLat,
        longitude: startLng
      }
    };
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

     /*  console.warn('Fallo OSRM, usando respaldo lineal:', error.message); */
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

  private calculateDeliveryFee(distanceKm: number, shippingType: string = 'Moto'): number {
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

    // Recargo por tipo de envío
    if (shippingType === 'Carro') {
      fee += 3.00;
    } else if (shippingType === 'Pickup') {
      fee += 7.00;
    }

    return parseFloat(fee.toFixed(2));
  }

  // --- MÉTODOS ESTÁNDAR ---

  findAll() {
    return this.orderRepository.find({ 
        order: { createdAt: 'DESC' },
        relations: ['items', 'business', 'user', 'deliveryUser']
    });
  }

  findPendingDeliveries(user?: User) {
    const whereClause: any = {
      deliveryUser: IsNull(),
      isPaid: true
    };

    if (user && (user.roles.includes('empleado') || user.roles.includes('worker'))) {
      const vehicle = user.vehicle || 'Moto';
      if (vehicle === 'Carro') {
        whereClause.shippingType = 'Carro';
      } else if (vehicle === 'Pickups') {
        whereClause.shippingType = 'Pickup';
      } else {
        whereClause.shippingType = 'Moto';
      }
    }

    return this.orderRepository.find({
      where: whereClause,
      order: { createdAt: 'DESC' },
      relations: ['items', 'business', 'user']
    });
  }

  findMyOrders(user: User) {
    return this.orderRepository.find({
        where: { user: { id: user.id } },
        order: { createdAt: 'DESC' },
        relations: ['items', 'business', 'deliveryUser']
    });
  }

  async update(id: string, updateOrderDto: UpdateOrderDto) { 
    const order = await this.orderRepository.findOne({ 
      where: { id },
      relations: ['items', 'business', 'user', 'deliveryUser'] 
    });
    if (!order) throw new NotFoundException(`Orden ${id} no encontrada`);
    
    if (updateOrderDto.status) order.status = updateOrderDto.status;
    if (updateOrderDto.isPaid !== undefined) order.isPaid = updateOrderDto.isPaid;
    if (updateOrderDto.category) order.category = updateOrderDto.category;
    if (updateOrderDto.shippingType) order.shippingType = updateOrderDto.shippingType;
    if (updateOrderDto.paymentRecipient) order.paymentRecipient = updateOrderDto.paymentRecipient;
    if (updateOrderDto.deliveryAddress) order.deliveryAddress = updateOrderDto.deliveryAddress;
    if (updateOrderDto.deliveryLat !== undefined) order.deliveryLat = updateOrderDto.deliveryLat;
    if (updateOrderDto.deliveryLong !== undefined) order.deliveryLong = updateOrderDto.deliveryLong;
    if (updateOrderDto.totalItems !== undefined) order.totalItems = updateOrderDto.totalItems;
    if (updateOrderDto.deliveryFee !== undefined) order.deliveryFee = updateOrderDto.deliveryFee;
    if (updateOrderDto.totalAmount !== undefined) order.totalAmount = updateOrderDto.totalAmount;
    
    if (updateOrderDto.deliveryUserId !== undefined) {
      if (updateOrderDto.deliveryUserId === null) {
        order.deliveryUser = null;
      } else {
        const user = await this.userRepository.findOne({ where: { id: updateOrderDto.deliveryUserId } });
        if (!user) throw new NotFoundException(`Usuario motorizado ${updateOrderDto.deliveryUserId} no encontrado`);
        
        // Validar compatibilidad de vehículo
        const isDriver = user.roles.includes('empleado') || user.roles.includes('worker');
        if (isDriver) {
          const driverVehicle = user.vehicle || 'Moto';
          const orderShipping = order.shippingType || 'Moto';
          
          if (orderShipping === 'Carro' && !['Carro', 'Pickups'].includes(driverVehicle)) {
            throw new BadRequestException(`Este pedido requiere Carro o Pickup. Tu vehículo actual es ${driverVehicle}.`);
          }
          if (orderShipping === 'Pickup' && driverVehicle !== 'Pickups') {
            throw new BadRequestException(`Este pedido requiere un vehículo tipo Pickup. Tu vehículo actual es ${driverVehicle}.`);
          }
        }
        order.deliveryUser = user;
      }
    }
    
    return this.orderRepository.save(order);
  }

  async remove(id: string) {
    const order = await this.orderRepository.findOne({ where: { id } });
    if (!order) throw new NotFoundException(`Orden ${id} no encontrada`);
    return this.orderRepository.remove(order);
  }

  async findOne(id: string) {
    const order = await this.orderRepository.findOne({ 
      where: { id },
      relations: ['items', 'business', 'user', 'deliveryUser']
    });
    if (!order) throw new NotFoundException(`Orden ${id} no encontrada`);
    return order;
  }
}