import { Module } from '@nestjs/common';
import { SessionEndingListener } from './listeners/session-ending.listener';

/** Попередження Telegram про кінець сесії Awake і таймера сну. */
@Module({ providers: [SessionEndingListener] })
export class SessionEndingModule {}
