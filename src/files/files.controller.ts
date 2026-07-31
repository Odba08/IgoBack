import { BadRequestException, Controller,Get,Param,Post, Res, UploadedFile, UseInterceptors, Req } from '@nestjs/common';
import { FilesService } from './files.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { fileFilter } from './helpers/fileFilter.helper';
import { diskStorage } from 'multer';
import { fileNamer } from './helpers/fileNamer.helper';
import { Response, Request } from 'express';
import { ConfigService } from '@nestjs/config';


@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService,
    private readonly configService: ConfigService
  ) {}

  @Get('products/:imageName' )
  findFoodImage(
    @Res() res: Response, 
    @Param('imageName') imageName: string
  ){
    const path = this.filesService.getStaticProductImage(imageName)

    res.sendFile(path);
  }

  @Get('user/:imageName')
  findUserImage(
    @Res() res: Response,
    @Param('imageName') imageName: string
  ){

    const path = this.filesService.getUserStaticProductImage(imageName)
    
    res.sendFile(path);
  }

  @Get('bussiness/:imageName')
  findExerciseImage(
    @Res() res: Response, 
    @Param('imageName') imageName: string
  ) {
    const path = this.filesService.getStaticProductImageniu(imageName)

    res.sendFile(path);
  }

  @Post('products')
  @UseInterceptors( FileInterceptor('file',{
    fileFilter: fileFilter,
    storage:diskStorage({
      destination: './static//products',
      filename:fileNamer
    })
  }))
  uploadFile(
    @UploadedFile()  file: Express.Multer.File,
    @Req() req: Request
  ){
    if(!file){
    throw new BadRequestException('No file uploaded')
    }

    const hostApi = this.configService.get('HOST_API') || `${req.protocol}://${req.get('host')}/api`;
    const secureUrl = `${hostApi}/files/products/${file.filename}`;

    return {
     secureUrl 
    }
  }

  @Post('user')
  @UseInterceptors( FileInterceptor('file',{
    fileFilter: fileFilter,
    storage:diskStorage({
      destination: './static//users',
      filename:fileNamer
    })
  }))
  uploadUserFile(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request
  ){
    if(!file){
      throw new BadRequestException('No file uploaded')
    }
    const hostApi = this.configService.get('HOST_API') || `${req.protocol}://${req.get('host')}/api`;
    const secureUrl = `${hostApi}/files/user/${file.filename}`;
    return {
      secureUrl
    }
  }
  
  @Post('bussiness')
  @UseInterceptors( FileInterceptor('file',{
    fileFilter: fileFilter,
    storage:diskStorage({
      destination: './static//bussiness',
      filename:fileNamer
    })
  }))
  uploadFilenuevo(
    @UploadedFile()  file: Express.Multer.File,
    @Req() req: Request
  ){
    if(!file){
    throw new BadRequestException('No file uploaded')
    }

    const hostApi = this.configService.get('HOST_API') || `${req.protocol}://${req.get('host')}/api`;
    const secureUrl = `${hostApi}/files/bussiness/${file.filename}`;

    return {
     secureUrl 
    }
  }
}
