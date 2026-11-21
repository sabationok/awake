import { SetMetadata } from '@nestjs/common';
import { BOT_SCREEN_METADATA } from '../constants/bot-metadata';

/** Екран меню namespace (повертає BotMenu). '' — головний, на нього йде й невідомий шлях. */
export const BotScreen = (path = ''): MethodDecorator => SetMetadata(BOT_SCREEN_METADATA, path);
