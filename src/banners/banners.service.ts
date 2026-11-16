import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Banner } from './entities/banner.entity';
import { CreateBannerDto } from './dto/create-banner.dto';
import { UpdateBannerDto } from './dto/update-banner.dto';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class BannersService implements OnModuleInit {
  constructor(
    @InjectRepository(Banner)
    private readonly bannerRepository: Repository<Banner>,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    try {
      const count = await this.bannerRepository.count();
      if (count === 0) {
        await this.seedDefaults();
      }
    } catch (error: any) {
      console.warn('⚠️ [BannersService] Auto-sembrado omitido o tabla aún no creada:', error?.message);
    }
  }

  async seedDefaults(): Promise<Banner[]> {
    const baseHost = this.configService.get<string>('HOST_API') || 'https://igoback-b84f.onrender.com/api';
    const cleanHost = baseHost.replace(/\/$/, '');

    const defaults: Partial<Banner>[] = [
      {
        title: 'Igo Store Oficial',
        imageUrl: `${cleanHost}/files/banners/igo_store.png`,
        actionType: 'INFO_MODAL',
        infoTitle: '¡Bienvenido a IGO Store!',
        infoContent: 'Descubre los mejores comercios, restaurantes, farmacias y servicios en IgoStore. Pide delivery rápido y seguro directo a tu puerta.',
        isActive: true,
        order: 1,
      },
      {
        title: 'Síguenos en Instagram',
        imageUrl: `${cleanHost}/files/banners/igo_instagram.png`,
        actionType: 'EXTERNAL_URL',
        actionUrl: 'https://www.instagram.com/igostore.ve',
        infoTitle: 'Comunidad IGO en Instagram',
        infoContent: 'Entérate de sorteos, promociones exclusivas, nuevos aliados comerciales y novedades siguiéndonos en nuestra cuenta oficial.',
        isActive: true,
        order: 2,
      },
      {
        title: 'Por tu Negocio en IGO',
        imageUrl: `${cleanHost}/files/banners/por_tu_negocio_en_igo.png`,
        actionType: 'INFO_MODAL',
        infoTitle: '¡Impulsa tu negocio con IGO Store!',
        infoContent: 'Únete a nuestra plataforma de comercios aliados. Aumenta tus ventas con entregas rápidas y visibilidad total ante miles de clientes en tu zona. Contáctanos al soporte para afiliar tu negocio hoy mismo.',
        isActive: true,
        order: 3,
      },
    ];

    const created: Banner[] = [];
    for (const b of defaults) {
      const banner = this.bannerRepository.create(b);
      created.push(await this.bannerRepository.save(banner));
    }
    console.log(`✅ [BannersService] ${created.length} banners oficiales sembrados exitosamente.`);
    return created;
  }

  async findAll(onlyActive = true): Promise<Banner[]> {
    if (onlyActive) {
      return this.bannerRepository.find({
        where: { isActive: true },
        order: { order: 'ASC', createdAt: 'DESC' },
      });
    }
    return this.bannerRepository.find({
      order: { order: 'ASC', createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Banner> {
    const banner = await this.bannerRepository.findOneBy({ id });
    if (!banner) {
      throw new NotFoundException(`Banner con ID ${id} no encontrado`);
    }
    return banner;
  }

  async create(createBannerDto: CreateBannerDto): Promise<Banner> {
    const banner = this.bannerRepository.create({
      actionType: 'NONE',
      isActive: true,
      order: 0,
      ...createBannerDto,
    });
    return this.bannerRepository.save(banner);
  }

  async update(id: string, updateBannerDto: UpdateBannerDto): Promise<Banner> {
    const banner = await this.findOne(id);
    const updated = Object.assign(banner, updateBannerDto);
    return this.bannerRepository.save(updated);
  }

  async remove(id: string): Promise<{ success: boolean; message: string }> {
    const banner = await this.findOne(id);
    await this.bannerRepository.remove(banner);
    return { success: true, message: `Banner ${id} eliminado con éxito` };
  }
}

