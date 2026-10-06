import { Controller, Get, Post, Body, Patch, Param, Delete, Req, UseGuards } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { GetQuoteDto } from './dto/get-quote.dto';
import { Auth } from 'src/auth/decorators/auth.decorator';
import { GetUser } from 'src/auth/decorators/get-user.decorator';
import { User } from 'src/users/entities/user.entity';
import { AuthGuard } from '@nestjs/passport';

import { OptionalJwtAuthGuard } from 'src/auth/guards/optional-jwt-auth.guard';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post('quote') // ⚡ ENDPOINT LIGERO: Para el mapa principal exploratorio
  getQuote(@Body() getQuoteDto: GetQuoteDto) {
    return this.ordersService.getRouteQuote(getQuoteDto);
  }
  
  @Post()
  @UseGuards(OptionalJwtAuthGuard)
  create(@Body() createOrderDto: CreateOrderDto, @Req() req: any) {
    // Si viene autenticado, req.user estará disponible
    const user: User | undefined = req.user;
    return this.ordersService.create(createOrderDto, user);
  }

  @Get('reports/business-debts')
  getBusinessDebtsReport() {
    return this.ordersService.getBusinessDebtsReport();
  }

  @Get('my-orders')
  @UseGuards(OptionalJwtAuthGuard)
  findMyOrders(@Req() req: any) {
    const user: User | undefined = req.user;
    if (!user) return [];
    return this.ordersService.findMyOrders(user);
  }

  @Get('pending-deliveries')
  @Auth()
  findPendingDeliveries(@GetUser() user: User) {
    return this.ordersService.findPendingDeliveries(user);
  }

  @Get('active-drivers')
  getActiveDrivers() {
    return this.ordersService.getActiveDrivers();
  }

  @Get()
  findAll() {

    return this.ordersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ordersService.findOne(id);
  }

  @Patch(':id/assign-driver')
  assignDriver(
    @Param('id') id: string,
    @Body('deliveryUserId') deliveryUserId: string | null,
  ) {
    return this.ordersService.assignDriver(id, deliveryUserId);
  }

  @Patch(':id/verify-payment')
  verifyPayment(
    @Param('id') id: string,
    @Body('isPaid') isPaid: boolean,
  ) {
    return this.ordersService.verifyPayment(id, isPaid !== undefined ? isPaid : true);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateOrderDto: UpdateOrderDto) {
    return this.ordersService.update(id, updateOrderDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.ordersService.remove(id);
  }
}
