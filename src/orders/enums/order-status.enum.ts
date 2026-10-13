export enum OrderStatus {
  PENDING = 'PENDING',       // Creada, esperando pago
  PAID = 'PAID',             // Pagada, esperando aprobación del restaurante
  PREPARING = 'PREPARING',   // En cocina
  READY = 'READY',           // Lista para recoger
  ON_WAY = 'ON_WAY',         // Motorizado en camino
  ARRIVED = 'ARRIVED',       // Motorizado llegó al destino
  DELIVERED = 'DELIVERED',   // Entregada
  CANCELLED = 'CANCELLED',   // Cancelada
}