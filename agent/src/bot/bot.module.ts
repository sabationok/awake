import { Global, Module } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';
import { BotRouterService } from './services/bot-router.service';

/**
 * Боти на декораторах: `@Bot(name, { namespace })` + `@BotAction` / `@BotScreen`. Самостійний шар без знання
 * про MaControl — кандидат у `@my-nestjs-kit/bots`.
 */
@Global()
@Module({
  imports: [DiscoveryModule],
  providers: [BotRouterService],
  exports: [BotRouterService],
})
export class BotModule {}
