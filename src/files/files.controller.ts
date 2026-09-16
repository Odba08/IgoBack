import { BadRequestException, Controller, Get, Param, Post, Res, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FilesService } from './files.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { fileFilter } from './helpers/fileFilter.helper';
import { memoryStorage } from 'multer';
import { Response } from 'express';

@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

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
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    const secureUrl = await this.filesService.uploadToImgBB(file);
    return { secureUrl };
  }

  @Post('user')
  @UseInterceptors(FileInterceptor('file', {
    fileFilter: fileFilter,
    storage: memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
  }))
  async uploadUserFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    const secureUrl = await this.filesService.uploadToImgBB(file);
    return { secureUrl };
  }

  @Post('bussiness')
  @UseInterceptors(FileInterceptor('file', {
    fileFilter: fileFilter,
    storage: memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
  }))
  async uploadFilenuevo(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    const secureUrl = await this.filesService.uploadToImgBB(file);
    return { secureUrl };
  }
}
