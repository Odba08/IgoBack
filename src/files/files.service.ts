import { join } from 'path';
import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { existsSync } from 'fs';
import axios from 'axios';
import * as FormData from 'form-data';

@Injectable()
export class FilesService {
  constructor(private readonly configService: ConfigService) {}

  async uploadToImgBB(file: Express.Multer.File): Promise<string> {
    if (!file || !file.buffer) {
      throw new BadRequestException('No se ha recibido ningún archivo de imagen válido');
    }

    const apiKey = this.configService.get<string>('IMGBB_API_KEY') || '6dfbf7cb3ce7d636c4e9b06b5a89624e';

    try {
      const form = new FormData();
      form.append('image', file.buffer, {
        filename: file.originalname || 'upload.png',
        contentType: file.mimetype || 'image/png',
      });
      if (file.originalname) {
        form.append('name', file.originalname.split('.')[0]);
      }

      const { data } = await axios.post(
        `https://api.imgbb.com/1/upload?key=${apiKey}`,
        form,
        {
          headers: {
            ...form.getHeaders(),
            'User-Agent':
              'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          },
          timeout: 25000,
        }
      );

      if (data && data.success && data.data && (data.data.url || data.data.display_url)) {
        return data.data.url || data.data.display_url;
      }

      throw new BadRequestException('ImgBB no devolvió una URL válida');
    } catch (error: any) {
      console.error('Error subiendo imagen a ImgBB:', error?.response?.data || error?.message);
      throw new BadRequestException(
        error?.response?.data?.error?.message || 'Error al subir la imagen al almacenamiento en la nube'
      );
    }
  }

  getStaticProductImage(imageName: string) {
    const path = join(__dirname, '../../static/products', imageName);
    if (!existsSync(path)) throw new BadRequestException('Image not found');
    return path;
  }

  getUserStaticProductImage(imageName: string) {
    const path = join(__dirname, '../../static/users', imageName);
    if (!existsSync(path)) throw new BadRequestException('Image not found');
    return path;
  }

  getStaticProductImageniu(imageName: string) {
    const path = join(__dirname, '../../static/bussiness', imageName);
    if (!existsSync(path)) throw new BadRequestException('Image not found');
    return path;
  }
}
