import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { DevicesModule } from '../devices/devices.module';
import { WebAuthModule } from '../web-auth/web-auth.module';
import { AuthGuard } from './auth.guard';
import { AgentToken } from './strategies/agent-token';
import { LocalStrategy } from './strategies/local.strategy';
import { TailscaleStrategy } from './strategies/tailscale.strategy';

/** Guard з реєстром стратегій каналів (local, tailscale) на всі роути. */
@Module({
  imports: [DevicesModule, WebAuthModule],
  providers: [AgentToken, LocalStrategy, TailscaleStrategy, { provide: APP_GUARD, useClass: AuthGuard }],
})
export class AuthModule {}
