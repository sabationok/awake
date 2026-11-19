import 'reflect-metadata';
import { redirectStrayStdout } from './mac-bridge/services/protocol-stdout';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { existsSync } from 'node:fs';
import { AppModule } from './app.module';
import { AGENT_CONFIG, AgentConfig } from './config/agent-config';
import { StderrLogger } from './common/stderr-logger';
import { MacBridgeService } from './mac-bridge/services/mac-bridge.service';

// stdout належить протоколу з Mac-аппкою; усе інше, що туди пише, йде в stderr.
redirectStrayStdout();

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { logger: new StderrLogger('agent') });
  const config = app.get<AgentConfig>(AGENT_CONFIG);

  if (config.corsOrigin) app.enableCors({ origin: config.corsOrigin });
  // Локальна збірка дашборду. Її файли публічні, дані віддає лише API з токеном.
  if (config.webDir && existsSync(config.webDir)) app.useStaticAssets(config.webDir);
  app.enableShutdownHooks();

  await app.listen(config.port, '0.0.0.0');
  app.get(MacBridgeService).sendReady(config.port);
}

void bootstrap();
