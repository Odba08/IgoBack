import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Setting } from './entities/setting.entity';

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(Setting)
    private readonly settingRepository: Repository<Setting>,
  ) {}

  async getSetting(key: string): Promise<Setting> {
    let setting = await this.settingRepository.findOne({ where: { key } });
    if (!setting) {
      if (key === 'BCV_RATE') {
        setting = this.settingRepository.create({ key, value: '75.54' });
        await this.settingRepository.save(setting);
      } else {
        throw new NotFoundException(`Setting with key ${key} not found`);
      }
    }
    return setting;
  }

  async updateSetting(key: string, value: string): Promise<Setting> {
    let setting = await this.settingRepository.findOne({ where: { key } });
    if (!setting) {
      setting = this.settingRepository.create({ key, value });
    } else {
      setting.value = value;
    }
    return this.settingRepository.save(setting);
  }
}
