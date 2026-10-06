import { Controller, Get, Param, Patch, Post, Body } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { UpdateSettingDto } from './dto/update-setting.dto';

@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  getAllSettings() {
    return this.settingsService.getAllSettings();
  }

  @Post('bulk')
  updateBulk(@Body() settings: Record<string, string>) {
    return this.settingsService.updateBulk(settings);
  }

  @Patch('bulk')
  updateBulkPatch(@Body() settings: Record<string, string>) {
    return this.settingsService.updateBulk(settings);
  }

  @Get(':key')
  getSetting(@Param('key') key: string) {
    return this.settingsService.getSetting(key);
  }

  @Patch(':key')
  updateSetting(@Param('key') key: string, @Body() updateSettingDto: UpdateSettingDto) {
    return this.settingsService.updateSetting(key, updateSettingDto.value);
  }
}

