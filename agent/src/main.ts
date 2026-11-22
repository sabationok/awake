import 'reflect-metadata';
import { redirectStrayStdout } from './mac-bridge/services/protocol-stdout';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { NextFunction, Request, Response } from 'express';
import { existsSync } from 'node:fs';
import { createServer } from 'node:http';
import { AppModule } from './app.module';
import { AGENT_CONFIG, AgentConfig, readAgentConfig } from './config/agent-config';
import { StderrLogger } from './common/stderr-logger';
import { MacBridgeService } from './mac-bridge/services/mac-bridge.service';
import { findLanAddresses } from './presence/helpers/find-lan-addresses';
import { ensureTls } from './tls/helpers/ensure-tls';

// stdout належить протоколу з Mac-аппкою; усе інше, що туди пише, йде в stderr.
redirectStrayStdout();

async function bootstrap() {
  // httpsOptions читаються лише при створенні застосунку, тож сертифікат готуємо до NestFactory.create.
  const early = readAgentConfig();
  const tls = ensureTls(early.tlsDir, findLanAddresses());
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: new StderrLogger('agent'),
    httpsOptions: { key: tls.key, cert: tls.cert },
  });
  const config = app.get<AgentConfig>(AGENT_CONFIG);

  const allowedOrigins = [...config.dashboardOrigins, ...(config.corsOrigin ? [config.corsOrigin] : [])];
  // Chrome шле preflight із Private-Network-Access, коли публічний сайт звертається до приватної IP.
  // Заголовок ставимо до CORS-middleware, щоб він дійшов до відповіді на preflight.
  app.use((req: Request, res: Response, next: NextFunction) => {
    const origin = req.headers.origin;
    if (
      req.method === 'OPTIONS' &&
      req.headers['access-control-request-private-network'] === 'true' &&
      origin &&
      allowedOrigins.includes(origin)
    ) {
      res.setHeader('Access-Control-Allow-Private-Network', 'true');
    }
    next();
  });
  app.enableCors({
    origin: allowedOrigins,
    allowedHeaders: ['Authorization', 'Content-Type'],
    methods: ['GET', 'POST'],
    maxAge: 600,
  });
  // Локальна збірка дашборду. Її файли публічні, дані віддає лише API з токеном.
  if (config.webDir && existsSync(config.webDir)) app.useStaticAssets(config.webDir);
  app.enableShutdownHooks();

  await app.listen(config.port, '0.0.0.0');
  // Той самий express-застосунок ще й на простому http: локальне сполучення в довіреній Wi-Fi без попереджень про сертифікат.
  // Гард пускає не-loopback запити лише в довіреній мережі, тож поза нею цей порт нічого не віддає, крім статики.
  createServer(app.getHttpAdapter().getInstance())
    .on('error', (error) => process.stderr.write(`[agent] http :${config.httpPort} failed: ${error.message}\n`))
    .listen(config.httpPort, '0.0.0.0');
  // Лише для `tailscale serve`: на loopback, тож з LAN сюди не дістатись. Усе, що прийшло сюди, — з tailnet.
  createServer(app.getHttpAdapter().getInstance())
    .on('error', (error) => process.stderr.write(`[agent] tailnet :${config.tailnetPort} failed: ${error.message}\n`))
    .listen(config.tailnetPort, '127.0.0.1');
  app.get(MacBridgeService).sendReady(config.port);
}

void bootstrap();
