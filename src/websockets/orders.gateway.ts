import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class OrdersGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(OrdersGateway.name);

  @WebSocketServer()
  server: Server;

  // Mapa de repartidores conectados: socketId -> { userId, name, vehicle, lat, lng, lastSeen }
  private activeDrivers = new Map<string, any>();

  handleConnection(client: Socket) {
    this.logger.log(`🔌 Cliente conectado al WebSocket: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`❌ Cliente desconectado: ${client.id}`);
    if (this.activeDrivers.has(client.id)) {
      this.activeDrivers.delete(client.id);
      this.broadcastActiveDrivers();
    }
  }

  // Repartidor se registra como en línea
  @SubscribeMessage('driver:register')
  handleDriverRegister(
    @ConnectedSocket() client: Socket,
    @MessageBody() driverData: { userId: string; name: string; vehicle?: string; phone?: string }
  ) {
    this.activeDrivers.set(client.id, {
      socketId: client.id,
      ...driverData,
      connectedAt: new Date(),
    });
    this.logger.log(`🛵 Repartidor activo registrado: ${driverData.name} (${driverData.userId})`);
    this.broadcastActiveDrivers();
  }

  // Repartidor actualiza su posición GPS en tiempo real
  @SubscribeMessage('driver:location_update')
  handleDriverLocation(
    @ConnectedSocket() client: Socket,
    @MessageBody() locationData: { latitude: number; longitude: number }
  ) {
    const driver = this.activeDrivers.get(client.id);
    if (driver) {
      driver.latitude = locationData.latitude;
      driver.longitude = locationData.longitude;
      driver.lastLocationAt = new Date();
      this.activeDrivers.set(client.id, driver);
      
      // Emitir a los administradores / clientes que rastrean
      this.server.emit('driver:location', {
        userId: driver.userId,
        latitude: locationData.latitude,
        longitude: locationData.longitude,
      });
    }
  }

  // Enviar lista actualizada de repartidores activos
  private broadcastActiveDrivers() {
    const list = Array.from(this.activeDrivers.values());
    this.server.emit('drivers:active_list', list);
    this.server.emit('drivers:locations', list);
  }

  // Notificar a todos cuando se crea un nuevo pedido
  notifyOrderCreated(order: any) {
    if (this.server) {
      this.server.emit('order:created', order);
    }
  }

  // Notificar actualización de pedido (estado, repartidor, pago)
  notifyOrderUpdated(order: any) {
    if (this.server) {
      this.server.emit('order:updated', order);
      this.server.emit(`order:${order.id}:updated`, order);
    }
  }

  // Notificar que un pago fue verificado por el Admin
  notifyPaymentVerified(order: any) {
    if (this.server) {
      this.server.emit('order:payment_verified', order);
      this.server.emit(`order:${order.id}:paid`, order);
    }
  }

  // Notificar asignación de repartidor
  notifyDriverAssigned(order: any, driverId: string) {
    if (this.server) {
      this.server.emit('order:driver_assigned', { order, driverId });
      this.server.emit(`driver:${driverId}:new_assignment`, order);
    }
  }

  // Obtener lista actual de activos
  getActiveDriversList() {
    return Array.from(this.activeDrivers.values());
  }
}
