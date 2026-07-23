import { Controller, Get, Post, Body, Patch, Param, Delete, Req, UseGuards } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { GetQuoteDto } from './dto/get-quote.dto';
import { Auth } from 'src/auth/decorators/auth.decorator';
import { GetUser } from 'src/auth/decorators/get-user.decorator';
import { User } from 'src/users/entities/user.entity';
import { AuthGuard } from '@nestjs/passport';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post('quote') // ⚡ ENDPOINT LIGERO: Para el mapa principal exploratorio
  getQuote(@Body() getQuoteDto: GetQuoteDto) {
    return this.ordersService.getRouteQuote(getQuoteDto);
  }
  
  @Post()
  @UseGuards(AuthGuard(['jwt']))
  create(@Body() createOrderDto: CreateOrderDto, @Req() req: any) {
    // Si viene autenticado, req.user estará disponible
    const user: User | undefined = req.user;
    return this.ordersService.create(createOrderDto, user);
  }

  @Get('my-orders')
  @Auth()
  findMyOrders(@GetUser() user: User) {
    return this.ordersService.findMyOrders(user);
  }

  @Get()
  findAll() {
    return this.ordersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ordersService.findOne(id);
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
