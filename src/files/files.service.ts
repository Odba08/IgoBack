import { join } from 'path';
import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { existsSync, writeFileSync, mkdirSync } from 'fs';
import { v4 as uuid } from 'uuid';
import axios from 'axios';
import * as FormData from 'form-data';

@Injectable()
export class FilesService {
  constructor(private readonly configService: ConfigService) {}

  saveLocally(buffer: Buffer, originalName = 'upload.jpg', hostApi?: string): string {
    const ext = originalName.includes('.') ? originalName.split('.').pop()?.toLowerCase() || 'jpg' : 'jpg';
    const fileName = `${uuid()}.${ext}`;
    const staticDir = existsSync(join(__dirname, '../../static/products'))
      ? join(__dirname, '../../static/products')
      : join(process.cwd(), 'static/products');

    if (!existsSync(staticDir)) {
      mkdirSync(staticDir, { recursive: true });
    }

    const filePath = join(staticDir, fileName);
    writeFileSync(filePath, buffer);

    const baseHost = hostApi || this.configService.get<string>('HOST_API') || 'https://igoback.onrender.com/api';
    const cleanHost = baseHost.replace(/\/$/, '');
    const finalUrl = `${cleanHost}/files/products/${fileName}`;
    console.log('💾 [FilesService] Imagen guardada en almacenamiento local como fallback:', finalUrl);
    return finalUrl;
  }

  async uploadToImgBB(file: Express.Multer.File, hostApi?: string): Promise<string> {
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
          timeout: 10000,
        }
      );

      if (data && data.success && data.data && (data.data.url || data.data.display_url)) {
        return data.data.url || data.data.display_url;
      }
    } catch (error: any) {
      console.warn('⚠️ ImgBB falló, usando almacenamiento local de respaldo:', error?.response?.data || error?.message);
    }

    return this.saveLocally(file.buffer, file.originalname, hostApi);
  }

  async uploadBase64ToImgBB(base64Str: string, name = 'upload', hostApi?: string): Promise<string> {
    if (!base64Str) {
      throw new BadRequestException('No se ha recibido base64 válido');
    }
    const cleanBase64 = base64Str.replace(/^data:image\/[a-z0-9+]+;base64,/, '').trim();
    const buffer = Buffer.from(cleanBase64, 'base64');

    if (!buffer || buffer.length === 0) {
      throw new BadRequestException('El formato base64 de la imagen es inválido');
    }

    const apiKey = this.configService.get<string>('IMGBB_API_KEY') || '6dfbf7cb3ce7d636c4e9b06b5a89624e';

    try {
      const form = new FormData();
      const filename = name.endsWith('.png') ? name : (name.endsWith('.jpg') || name.endsWith('.jpeg') ? name : `${name}.jpg`);
      const contentType = filename.endsWith('.png') ? 'image/png' : 'image/jpeg';
      form.append('image', buffer, {
        filename,
        contentType,
      });
      if (name) {
        form.append('name', name.split('.')[0]);
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
          timeout: 10000,
        }
      );

      if (data && data.success && data.data && (data.data.url || data.data.display_url)) {
        return data.data.url || data.data.display_url;
      }
    } catch (error: any) {
      console.warn('⚠️ ImgBB base64 falló, usando almacenamiento local de respaldo:', error?.response?.data || error?.message);
    }

    return this.saveLocally(buffer, name, hostApi);
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
