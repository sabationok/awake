import { Global, Module } from '@nestjs/common';
import { TelegramNotificationsService } from './telegram-notifications.service';

@Global()
@Module({ providers: [TelegramNotificationsService], exports: [TelegramNotificationsService] })
export class TelegramNotificationsModule {}
