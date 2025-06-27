import { BadRequestException, Controller,Get,Param,Post, Res, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FilesService } from './files.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { fileFilter } from './helpers/fileFilter.helper';
import { diskStorage } from 'multer';
import { fileNamer } from './helpers/fileNamer.helper';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';


@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService,
    private readonly configService: ConfigService
  ) {}

  @Get('food/:imageName' )
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

  @Get('exercise/:imageName')
  findExerciseImage(
    @Res() res: Response, 
    @Param('imageName') imageName: string
  ) {
    const path = this.filesService.getStaticProductImageniu(imageName)

    res.sendFile(path);
  }

  @Post('food')
  @UseInterceptors( FileInterceptor('file',{
    fileFilter: fileFilter,
    storage:diskStorage({
      destination: './static//foods',
      filename:fileNamer
    })
  }))
  uploadFile(
    @UploadedFile()  file: Express.Multer.File
    
  ){
    if(!file){
    throw new BadRequestException('No file uploaded')
    }

   /*  const secureUrl= `${file.filename}`; */

    const secureUrl = `${this.configService.get('HOST_API')}/files/food/${file.filename}`

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
    @UploadedFile() file: Express.Multer.File
  ){
    if(!file){
      throw new BadRequestException('No file uploaded')
    }
    const secureUrl = `${this.configService.get('HOST_API')}/files/user/${file.filename}`
    return {
      secureUrl
    }
  }
  
  @Post('exercise')
  @UseInterceptors( FileInterceptor('file',{
    fileFilter: fileFilter,
    storage:diskStorage({
      destination: './static//exercise',
      filename:fileNamer
    })
  }))
  uploadFilenuevo(
    @UploadedFile()  file: Express.Multer.File
    
  ){
    if(!file){
    throw new BadRequestException('No file uploaded')
    }


    const secureUrl = `${this.configService.get('HOST_API')}/files/exercise/${file.filename}`

    return {
     secureUrl 
    }
  }
}
