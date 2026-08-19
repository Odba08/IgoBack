import { Controller, Get, Param, Patch, Body } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { UpdateSettingDto } from './dto/update-setting.dto';

@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get(':key')
  getSetting(@Param('key') key: string) {
    return this.settingsService.getSetting(key);
  }

  @Patch(':key')
  updateSetting(@Param('key') key: string, @Body() updateSettingDto: UpdateSettingDto) {
    return this.settingsService.updateSetting(key, updateSettingDto.value);
  }
}
