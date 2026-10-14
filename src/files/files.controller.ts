import { BadRequestException, Body, Controller, Get, Param, Post, Req, Res, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FilesService } from './files.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { fileFilter } from './helpers/fileFilter.helper';
import { memoryStorage } from 'multer';
import { Response, Request } from 'express';
import { ConfigService } from '@nestjs/config';

@Controller('files')
export class FilesController {
  constructor(
    private readonly filesService: FilesService,
    private readonly configService: ConfigService,
  ) {}

  private getHostApi(req: Request): string {
    const configHost = this.configService.get<string>('HOST_API');
    if (configHost) return configHost.replace(/\/$/, '');
    const protocol = (req.headers['x-forwarded-proto'] as string) || req.protocol || 'http';
    const host = req.get('host') || 'localhost:3000';
    return `${protocol}://${host}/api`;
  }

  @Get('products/:imageName')
  findFoodImage(
    @Res() res: Response,
    @Param('imageName') imageName: string
  ) {
    const path = this.filesService.getStaticProductImage(imageName);
    res.sendFile(path);
  }

  @Get('user/:imageName')
  findUserImage(
    @Res() res: Response,
    @Param('imageName') imageName: string
  ) {
    const path = this.filesService.getUserStaticProductImage(imageName);
    res.sendFile(path);
  }

  @Get('bussiness/:imageName')
  findExerciseImage(
    @Res() res: Response,
    @Param('imageName') imageName: string
  ) {
    const path = this.filesService.getStaticProductImageniu(imageName);
    res.sendFile(path);
  }

  @Post('products')
  @UseInterceptors(FileInterceptor('file', {
    fileFilter: fileFilter,
    storage: memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  }))
  async uploadFile(@UploadedFile() file: Express.Multer.File, @Req() req: Request) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    const hostApi = this.getHostApi(req);
    const secureUrl = await this.filesService.uploadToImgBB(file, hostApi);
    return { secureUrl };
  }

  @Post('user')
  @UseInterceptors(FileInterceptor('file', {
    fileFilter: fileFilter,
    storage: memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
  }))
  async uploadUserFile(@UploadedFile() file: Express.Multer.File, @Req() req: Request) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    const hostApi = this.getHostApi(req);
    const secureUrl = await this.filesService.uploadToImgBB(file, hostApi);
    return { secureUrl };
  }

  @Post('bussiness')
  @UseInterceptors(FileInterceptor('file', {
    fileFilter: fileFilter,
    storage: memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
  }))
  async uploadFilenuevo(@UploadedFile() file: Express.Multer.File, @Req() req: Request) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    const hostApi = this.getHostApi(req);
    const secureUrl = await this.filesService.uploadToImgBB(file, hostApi);
    return { secureUrl };
  }

  @Post('base64')
  async uploadBase64(@Body() body: { base64: string; name?: string }, @Req() req: Request) {
    if (!body?.base64) {
      throw new BadRequestException('No se ha proporcionado la imagen en base64');
    }
    const hostApi = this.getHostApi(req);
    const secureUrl = await this.filesService.uploadBase64ToImgBB(body.base64, body.name, hostApi);
    return { secureUrl };
  }
}
