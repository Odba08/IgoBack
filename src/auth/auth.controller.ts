import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard } from '@nestjs/passport';
import { LoginUserDto } from './dto/login-user.dto';
import { Auth } from './decorators/auth.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

 @Post('login')
 async login(@Body() loginUserDto: any) {
   return this.authService.login(loginUserDto);
 }

 @Get('profile')
 @UseGuards(AuthGuard('jwt'))
 getProfile(@Req() req:any) {
  return req.user;
}

@Get('admin-panel')
  @Auth('admin') 
  getAdminData(@Req() req: any) {
    return {
      message: 'Panel Administrativo',
      user: req.user
    };
}

}
