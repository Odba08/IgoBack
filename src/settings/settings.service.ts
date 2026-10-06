import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Setting } from './entities/setting.entity';

export const DEFAULT_SETTINGS: Record<string, { value: string; description: string }> = {
  BCV_RATE: { value: '75.54', description: 'Tasa BCV oficial (Bs. / USD)' },
  IGO_PAGO_MOVIL_BANK: { value: '0102 - Banco de Venezuela', description: 'Banco Pago Móvil IGO' },
  IGO_PAGO_MOVIL_PHONE: { value: '0412-1234567', description: 'Teléfono Pago Móvil IGO' },
  IGO_PAGO_MOVIL_ID: { value: 'V-12345678', description: 'Cédula / RIF Pago Móvil IGO' },
  IGO_PAGO_MOVIL_NAME: { value: 'IGO Delivery C.A.', description: 'Titular Pago Móvil IGO' },
  COMMISSION_IGO_DELIVERY: { value: '20', description: '% Comisión IGO por Delivery' },
  COMMISSION_IGO_TAXI: { value: '15', description: '% Comisión IGO por Servicio Taxi' },
  COMMISSION_DRIVER: { value: '80', description: '% Comisión para Repartidor / Conductor' },
  TAXI_MAX_BALANCE_LIMIT: { value: '50.00', description: 'Límite acumulación de saldo Taxi ($)' },
  FEE_BASE_DELIVERY: { value: '3.00', description: 'Tarifa Base Delivery ($)' },
  FEE_KM_DELIVERY: { value: '1.00', description: 'Precio por KM Delivery ($)' },
  FEE_BASE_FAVOR: { value: '3.00', description: 'Tarifa Base IGO Favor ($)' },
  FEE_KM_FAVOR: { value: '1.00', description: 'Precio por KM IGO Favor ($)' },
  FEE_BASE_TAXI: { value: '5.00', description: 'Tarifa Base Taxi ($)' },
  FEE_KM_TAXI: { value: '1.50', description: 'Precio por KM Taxi ($)' },
  NIGHT_SHIFT_START: { value: '22:00', description: 'Hora inicio recargo nocturno (HH:mm)' },
  NIGHT_SHIFT_END: { value: '06:00', description: 'Hora fin recargo nocturno (HH:mm)' },
  NIGHT_SHIFT_SURCHARGE: { value: '1.5', description: 'Multiplicador de recargo nocturno' },
};

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(Setting)
    private readonly settingRepository: Repository<Setting>,
  ) {}

  async getAllSettings(): Promise<Record<string, string>> {
    const dbSettings = await this.settingRepository.find();
    const result: Record<string, string> = {};

    // First populate all default values
    for (const [key, item] of Object.entries(DEFAULT_SETTINGS)) {
      result[key] = item.value;
    }

    // Override with database values
    for (const setting of dbSettings) {
      result[setting.key] = setting.value;
    }

    return result;
  }

  async getSetting(key: string): Promise<Setting> {
    let setting = await this.settingRepository.findOne({ where: { key } });
    if (!setting) {
      const defaultVal = DEFAULT_SETTINGS[key]?.value;
      if (defaultVal !== undefined) {
        setting = this.settingRepository.create({ key, value: defaultVal });
        await this.settingRepository.save(setting);
      } else {
        throw new NotFoundException(`Setting with key ${key} not found`);
      }
    }
    return setting;
  }

  async getSettingValue(key: string, fallback?: string): Promise<string> {
    try {
      const setting = await this.getSetting(key);
      return setting.value;
    } catch {
      return fallback !== undefined ? fallback : (DEFAULT_SETTINGS[key]?.value || '0');
    }
  }

  async getNumericSetting(key: string, fallback: number = 0): Promise<number> {
    const val = await this.getSettingValue(key, String(fallback));
    const parsed = parseFloat(val);
    return isNaN(parsed) ? fallback : parsed;
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

  async updateBulk(settings: Record<string, string>): Promise<Record<string, string>> {
    for (const [key, value] of Object.entries(settings)) {
      if (typeof value === 'string' || typeof value === 'number') {
        await this.updateSetting(key, String(value));
      }
    }
    return this.getAllSettings();
  }
}

