import type { InlineKeyboardMarkup } from 'telegraf/types';
import { TelegramAddresseeDto } from './telegram-addressee.dto';

export class SendTelegramMessageDto extends TelegramAddresseeDto {
  html!: string;
  keyboard?: InlineKeyboardMarkup;
}
