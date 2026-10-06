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
import { OrderStatus } from './enums/order-status.enum';
import { NotificationsService } from 'src/notifications/notifications.service';
import { OrdersGateway } from 'src/websockets/orders.gateway';
import { SettingsService } from 'src/settings/settings.service';

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
    private readonly notificationsService: NotificationsService,
    private readonly ordersGateway: OrdersGateway,
    private readonly settingsService: SettingsService,
  ) {}


  async create(createOrderDto: CreateOrderDto, user?: User) {
    // ⚡ 1. Extraemos las nuevas variables de recogida
    const {
      items,
      businessId,
      deliveryLat,
      deliveryLong,
      deliveryAddress,
      userIdTemp,
      pickupLat,
      pickupLong,
      category,
      shippingType,
      paymentRecipient,
      packageValue,
      packageSize,
      isInsured,
      paymentCaptureUrl,
      paymentReference,
      paymentMethod,
    } = createOrderDto;

    const isFavorOrTaxi = category === 'IgoFavor' || category === 'IgoTaxi' || !businessId || businessId === '00000000-0000-0000-0000-000000000000';

    let business = null;
    if (businessId && businessId !== '00000000-0000-0000-0000-000000000000') {
      business = await this.businessRepository.findOne({ where: { id: businessId } });
      if (!business && !isFavorOrTaxi) throw new NotFoundException(`Negocio ${businessId} no encontrado`);
    }

    // ⚡ 2. DETERMINACIÓN DEL PUNTO A: Priorizamos el mapa del usuario sobre la base de datos
    const startLat = pickupLat ? pickupLat : (business ? business.latitude : null);
    const startLng = pickupLong ? pickupLong : (business ? business.longitude : null);

    if (startLat === null || startLng === null || startLat === undefined || startLng === undefined) {
      throw new BadRequestException('Se requiere un punto de origen válido para calcular la ruta.');
    }

    // 3. Calcular Ruta Real con las coordenadas definitivas
    const routeData = await this.calculateRouteData(
        startLat, startLng, 
        deliveryLat, deliveryLong
    );

    const deliveryFee = await this.calculateDeliveryFee(
      routeData.distance, 
      shippingType || 'Moto',
      category,
      packageValue,
      packageSize,
      isInsured
    );

    // ⚡ BIFURCACIÓN: Si no hay items (Favor/Taxi), se guarda la orden de manera simplificada
    if (!items || items.length === 0) {
      const order = this.orderRepository.create({
          business,
          user: user || null,
          pickupLat: startLat,
          pickupLong: startLng,
          pickupAddress: createOrderDto.pickupAddress || 'Dirección de Recogida',
          deliveryAddress,
          deliveryLat,
          deliveryLong,
          userIdTemp,
          items: [],
          totalItems: 0,
          deliveryFee: deliveryFee,
          totalAmount: deliveryFee,
          category: category || 'Envíos',
          shippingType: shippingType || 'Moto',
          paymentRecipient: paymentRecipient || 'Pago IGO',
          packageValue,
          packageSize,
          isInsured: isInsured || false,
          paymentCaptureUrl,
          paymentReference,
          paymentMethod: paymentMethod || 'PAGO_MOVIL',
      });

      await this.orderRepository.save(order);

      // Notificación Socket en tiempo real
      this.ordersGateway.notifyOrderCreated(order);

      if (user?.pushToken) {
        this.notificationsService.sendPushNotification({
          to: user.pushToken,
          title: '¡Recibimos tu pedido! 🛍️',
          body: `Tu orden #${String(order.orderNumber).padStart(4, '0')} ha sido recibida con éxito.`,
          data: { orderId: order.id, status: 'CREATED' },
        }).catch(() => null);
      }

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
    }

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
        if (business && business.category) {
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
        } else {
          finalCategory = category || 'Compras';
        }

        const order = this.orderRepository.create({
            business,
            user: user || null,
            pickupLat: startLat,
            pickupLong: startLng,
            pickupAddress: createOrderDto.pickupAddress || (business ? business.name : 'Dirección de Recogida'),
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
            paymentRecipient: paymentRecipient || 'Pago IGO',
            packageValue,
            packageSize,
            isInsured: isInsured || false,
            paymentCaptureUrl,
            paymentReference,
            paymentMethod: paymentMethod || 'PAGO_MOVIL',
        });

        await queryRunner.manager.save(order);
        await queryRunner.commitTransaction();

        // Notificación Socket en tiempo real
        this.ordersGateway.notifyOrderCreated(order);

        if (user?.pushToken) {
          this.notificationsService.sendPushNotification({
            to: user.pushToken,
            title: '¡Recibimos tu pedido! 🛍️',
            body: `Tu orden #${String(order.orderNumber).padStart(4, '0')} por $${order.totalAmount.toFixed(2)} ha sido creada con éxito.`,
            data: { orderId: order.id, status: 'CREATED' },
          }).catch(() => null);
        }

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
    const { businessId, pickupLat, pickupLong, deliveryLat, deliveryLong, shippingType, category, packageValue, packageSize, isInsured } = getQuoteDto;

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
    const deliveryFee = await this.calculateDeliveryFee(
      routeData.distance, 
      shippingType || 'Moto',
      category,
      packageValue,
      packageSize,
      isInsured
    );

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

  private async calculateDeliveryFee(
    distanceKm: number, 
    shippingType: string = 'Moto',
    category?: string,
    packageValue?: number,
    packageSize?: string,
    isInsured: boolean = false
  ): Promise<number> {
    const isFavor = category === 'IgoFavor';
    const isTaxi = category === 'IgoTaxi' || category === 'Taxi';

    let baseFee = 3.00;
    let pricePerKm = 1.00;
    const freeKmLimit = 3;

    if (isTaxi) {
      baseFee = await this.settingsService.getNumericSetting('FEE_BASE_TAXI', 5.00);
      pricePerKm = await this.settingsService.getNumericSetting('FEE_KM_TAXI', 1.50);
    } else if (isFavor) {
      baseFee = await this.settingsService.getNumericSetting('FEE_BASE_FAVOR', 3.00);
      pricePerKm = await this.settingsService.getNumericSetting('FEE_KM_FAVOR', 1.00);
    } else {
      baseFee = await this.settingsService.getNumericSetting('FEE_BASE_DELIVERY', 3.00);
      pricePerKm = await this.settingsService.getNumericSetting('FEE_KM_DELIVERY', 1.00);
    }

    let fee = baseFee;
    if (distanceKm > freeKmLimit) {
      fee += (distanceKm - freeKmLimit) * pricePerKm;
    }

    // Recargo nocturno configurable
    const nightStartStr = await this.settingsService.getSettingValue('NIGHT_SHIFT_START', '22:00');
    const nightEndStr = await this.settingsService.getSettingValue('NIGHT_SHIFT_END', '06:00');
    const nightSurcharge = await this.settingsService.getNumericSetting('NIGHT_SHIFT_SURCHARGE', 1.5);

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    
    const [startH, startM] = (nightStartStr || '22:00').split(':').map(Number);
    const [endH, endM] = (nightEndStr || '06:00').split(':').map(Number);
    const startMinutes = (startH || 22) * 60 + (startM || 0);
    const endMinutes = (endH || 6) * 60 + (endM || 0);

    let isNight = false;
    if (startMinutes > endMinutes) {
      isNight = currentMinutes >= startMinutes || currentMinutes < endMinutes;
    } else {
      isNight = currentMinutes >= startMinutes && currentMinutes < endMinutes;
    }

    if (isNight && nightSurcharge > 0) {
      fee *= nightSurcharge;
    }

    // Recargo por tipo de envío
    if (shippingType === 'Carro') {
      fee += 3.00;
    } else if (shippingType === 'Pickup') {
      fee += 7.00;
    }

    // Recargos específicos de IgoFavor
    if (isFavor) {
      if (packageSize === 'mediano') {
        fee += 2.00;
      } else if (packageSize === 'grande') {
        fee += 5.00;
      }
      
      if (packageValue && packageValue >= 100) {
        fee += packageValue * 0.05;
      }

      if (isInsured && packageValue) {
        fee += packageValue * 0.02;
      }
    }

    return parseFloat(fee.toFixed(2));
  }

  getActiveDrivers() {
    return this.ordersGateway.getActiveDriversList();
  }

  // --- MÉTODOS ESTÁNDAR ---

  findAll() {
    return this.orderRepository.find({ 
        order: { createdAt: 'DESC' },
        relations: ['items', 'business', 'user', 'deliveryUser']
    });
  }

  async findPendingDeliveries(user?: User) {
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

    const orders = await this.orderRepository.find({
      where: whereClause,
      order: { createdAt: 'DESC' },
      relations: ['items', 'business', 'user']
    });

    // Exclude IgoTaxi orders for users who don't have 'Carro' as vehicle
    if (user && (user.roles.includes('empleado') || user.roles.includes('worker'))) {
      const vehicle = user.vehicle || 'Moto';
      if (vehicle !== 'Carro') {
        return orders.filter(o => o.category !== 'IgoTaxi');
      }
    }

    return orders;
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
    
    const prevStatus = order.status;

    if (updateOrderDto.status) {
      // Regla de Oro: Evitar revertir un pedido completado (DELIVERED/CANCELLED) a estados anteriores por sobreescritura concurrente
      if ((prevStatus === OrderStatus.DELIVERED || prevStatus === OrderStatus.CANCELLED) && 
          updateOrderDto.status !== prevStatus) {
         console.warn(`[Defensive Guard] Intento de revertir orden de ${prevStatus} a ${updateOrderDto.status} ignorado.`);
      } else {
        order.status = updateOrderDto.status;
        
        // Si cambia de READY / PENDING / PAID a ON_WAY, setear acceptedAt
        if (updateOrderDto.status === OrderStatus.ON_WAY && prevStatus !== OrderStatus.ON_WAY) {
          order.acceptedAt = new Date();
        }
        
        // Si cambia a DELIVERED, setear completedAt
        if (updateOrderDto.status === OrderStatus.DELIVERED && prevStatus !== OrderStatus.DELIVERED) {
          order.completedAt = new Date();
        }
      }
    }

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
    if (updateOrderDto.photoUrl !== undefined) order.photoUrl = updateOrderDto.photoUrl;
    if (updateOrderDto.paymentCaptureUrl !== undefined) order.paymentCaptureUrl = updateOrderDto.paymentCaptureUrl;
    if (updateOrderDto.packageValue !== undefined) order.packageValue = updateOrderDto.packageValue;
    if (updateOrderDto.packageSize !== undefined) order.packageSize = updateOrderDto.packageSize;
    if (updateOrderDto.isInsured !== undefined) order.isInsured = updateOrderDto.isInsured;
    
    if (updateOrderDto.deliveryUserId !== undefined) {
      if (updateOrderDto.deliveryUserId === null || updateOrderDto.deliveryUserId === '') {
        order.deliveryUser = null;
      } else {
        const user = await this.userRepository.findOne({ where: { id: updateOrderDto.deliveryUserId } });
        if (!user) throw new NotFoundException(`Usuario motorizado ${updateOrderDto.deliveryUserId} no encontrado`);
        
        // Si el pedido se le asigna a un motorizado y no estaba en ON_WAY, se cambia a ON_WAY y se registra acceptedAt
        if (order.status !== OrderStatus.ON_WAY && order.status !== OrderStatus.DELIVERED && order.status !== OrderStatus.CANCELLED) {
          order.status = OrderStatus.ON_WAY;
          order.acceptedAt = new Date();
        }

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
    
    if (updateOrderDto.paymentReference !== undefined) order.paymentReference = updateOrderDto.paymentReference;
    if (updateOrderDto.paymentMethod !== undefined) order.paymentMethod = updateOrderDto.paymentMethod;
    if (updateOrderDto.verifiedAt !== undefined) order.verifiedAt = updateOrderDto.verifiedAt;
    
    const savedOrder = await this.orderRepository.save(order);

    // Notificación Socket en tiempo real
    this.ordersGateway.notifyOrderUpdated(savedOrder);

    // Disparar Notificación Push al cliente si cambió de estado y tiene token
    if (order.user?.pushToken && updateOrderDto.status && updateOrderDto.status !== prevStatus) {
      this.notificationsService.notifyOrderStatusUpdate(
        order.user.pushToken,
        order.id,
        order.status,
      ).catch(() => null);
    }

    return savedOrder;
  }

  // --- ASIGNACIÓN RÁPIDA DE REPARTIDOR (DESDE PANEL ADMIN) ---
  async assignDriver(id: string, deliveryUserId: string | null) {
    const order = await this.orderRepository.findOne({
      where: { id },
      relations: ['items', 'business', 'user', 'deliveryUser'],
    });
    if (!order) throw new NotFoundException(`Orden ${id} no encontrada`);

    if (!deliveryUserId) {
      order.deliveryUser = null;
    } else {
      const driver = await this.userRepository.findOne({ where: { id: deliveryUserId } });
      if (!driver) throw new NotFoundException(`Repartidor ${deliveryUserId} no encontrado`);
      order.deliveryUser = driver;

      // Si no estaba en camino o entregada, pasar a ON_WAY
      if (order.status !== OrderStatus.DELIVERED && order.status !== OrderStatus.CANCELLED) {
        order.status = OrderStatus.ON_WAY;
        order.acceptedAt = new Date();
      }

      // Notificar al repartidor asignado vía WebSocket
      this.ordersGateway.notifyDriverAssigned(order, driver.id);
    }

    const savedOrder = await this.orderRepository.save(order);
    this.ordersGateway.notifyOrderUpdated(savedOrder);

    if (order.user?.pushToken && order.deliveryUser) {
      this.notificationsService.sendPushNotification({
        to: order.user.pushToken,
        title: '¡Repartidor asignado! 🛵',
        body: `${order.deliveryUser.fullName || 'Un repartidor'} va en camino con tu pedido #${String(order.orderNumber).padStart(4, '0')}.`,
        data: { orderId: order.id, status: order.status },
      }).catch(() => null);
    }

    return savedOrder;
  }

  // --- VERIFICACIÓN DE PAGO POR EL ADMIN ---
  async verifyPayment(id: string, isPaid: boolean) {
    const order = await this.orderRepository.findOne({
      where: { id },
      relations: ['items', 'business', 'user', 'deliveryUser'],
    });
    if (!order) throw new NotFoundException(`Orden ${id} no encontrada`);

    order.isPaid = isPaid;
    if (isPaid) {
      order.status = OrderStatus.PAID;
      order.verifiedAt = new Date();

      // Notificar a todos vía WebSocket que el pedido ya fue pagado/confirmado y está listo para despachar
      this.ordersGateway.notifyPaymentVerified(order);

      if (order.user?.pushToken) {
        this.notificationsService.sendPushNotification({
          to: order.user.pushToken,
          title: '¡Pago Confirmado! 🎉',
          body: `Tu pago para la orden #${String(order.orderNumber).padStart(4, '0')} ha sido verificado con éxito.`,
          data: { orderId: order.id, status: 'PAID' },
        }).catch(() => null);
      }
    }

    const savedOrder = await this.orderRepository.save(order);
    this.ordersGateway.notifyOrderUpdated(savedOrder);
    return savedOrder;
  }

  // --- REPORTE DE DEUDAS Y COMISIONES POR COMERCIO ---
  async getBusinessDebtsReport() {
    const businesses = await this.businessRepository.find({
      relations: ['orders'],
    });

    return businesses.map((b) => {
      const deliveredOrders = (b.orders || []).filter(
        (o) => o.status === OrderStatus.DELIVERED || o.isPaid
      );

      const totalSales = deliveredOrders.reduce((sum, o) => sum + (o.totalItems || 0), 0);
      const commissionRate = b.commissionPercentage || 10;
      const commissionDue = (totalSales * commissionRate) / 100;

      // Calcular fecha del pedido más antiguo pendiente de liquidación
      const oldestPendingDate = deliveredOrders.length > 0 ? deliveredOrders[deliveredOrders.length - 1].createdAt : null;

      return {
        businessId: b.id,
        businessName: b.name,
        legalName: b.legalName || b.name,
        rif: b.rif || 'N/A',
        paymentPhone: b.paymentPhone || 'N/A',
        isActive: b.isActive,
        commissionPercentage: commissionRate,
        totalOrdersCount: deliveredOrders.length,
        totalSalesAmount: parseFloat(totalSales.toFixed(2)),
        commissionDueAmount: parseFloat(commissionDue.toFixed(2)),
        oldestOrderDate: oldestPendingDate,
      };
    });
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