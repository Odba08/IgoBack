import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

export interface PushNotificationPayload {
  to: string | string[];
  title: string;
  body: string;
  data?: Record<string, any>;
  sound?: 'default' | null;
  channelId?: string;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly expoApiUrl = 'https://exp.host/--/api/v2/push/send';

  /**
   * Envía una o múltiples notificaciones push usando el servicio de Expo
   */
  async sendPushNotification(payload: PushNotificationPayload): Promise<boolean> {
    const recipients = Array.isArray(payload.to) ? payload.to : [payload.to];
    const validTokens = recipients.filter((token) => this.isValidExpoPushToken(token));

    if (validTokens.length === 0) {
      this.logger.warn(`No hay tokens Expo válidos para enviar notificación: ${JSON.stringify(recipients)}`);
      return false;
    }

    const messages = validTokens.map((token) => ({
      to: token,
      sound: payload.sound ?? 'default',
      title: payload.title,
      body: payload.body,
      data: payload.data ?? {},
      channelId: payload.channelId ?? 'orders',
      priority: 'high',
    }));

    try {
      const response = await axios.post(this.expoApiUrl, messages, {
        headers: {
          'Accept': 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      });

      this.logger.log(`Notificación push enviada con éxito a ${validTokens.length} dispositivo(s).`);
      return true;
    } catch (error: any) {
      this.logger.error('Error enviando notificación push a Expo:', error?.response?.data || error?.message);
      return false;
    }
  }

  /**
   * Notificación para actualización de estado de orden
   */
  async notifyOrderStatusUpdate(pushToken: string, orderId: string, status: string) {
    if (!pushToken) return;

    let title = 'IgoStore 🛍️';
    let body = `Tu pedido #${orderId.slice(0, 8)} ha cambiado a estado: ${status}`;

    switch (status.toLowerCase()) {
      case 'accepted':
      case 'confirmado':
      case 'confirmed':
        title = '¡Pedido Confirmado! ✅';
        body = `Tu pedido #${orderId.slice(0, 8)} ha sido aceptado y confirmado por el comercio.`;
        break;
      case 'preparing':
      case 'preparando':
      case 'en preparacion':
        title = '🍳 ¡En Preparación!';
        body = `El comercio está preparando los productos de tu pedido #${orderId.slice(0, 8)}.`;
        break;
      case 'dispatched':
      case 'en camino':
      case 'despachado':
      case 'on_the_way':
        title = '🛵 ¡Tu pedido va en camino!';
        body = `El repartidor ya lleva tu pedido #${orderId.slice(0, 8)} directo a tu ubicación.`;
        break;
      case 'delivered':
      case 'entregado':
        title = '🎉 ¡Pedido Entregado!';
        body = `Tu pedido #${orderId.slice(0, 8)} ha sido entregado con éxito. ¡Buen provecho!`;
        break;
      case 'cancelled':
      case 'cancelado':
        title = '❌ Pedido Cancelado';
        body = `Tu pedido #${orderId.slice(0, 8)} ha sido cancelado.`;
        break;
    }

    return this.sendPushNotification({
      to: pushToken,
      title,
      body,
      data: { orderId, status },
      channelId: 'orders',
    });
  }

  /**
   * Valida si un string cumple el formato de Expo Push Token
   */
  private isValidExpoPushToken(token: string): boolean {
    return typeof token === 'string' && (token.startsWith('ExponentPushToken[') || token.startsWith('ExpoPushToken['));
  }
}
