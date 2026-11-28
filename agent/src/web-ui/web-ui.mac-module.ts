import { Inject, Injectable } from '@nestjs/common';
import type { UiPage } from '@awake/contracts';
import { AGENT_CONFIG, AgentConfig } from '../config/agent-config';
import { describeUserAgent } from '../devices/helpers/describe-user-agent';
import { DevicesBridgeService } from '../devices/services/devices-bridge.service';
import { PairingService } from '../devices/services/pairing.service';
import { AppSecretsService } from '../secrets';
import type { MacModule, ModuleContext } from '../modules/types/mac-module';
import { findLanAddress } from '../presence/helpers/find-lan-address';
import { readWebInfo } from '../server-info/helpers/read-web-info';
import { TailscaleService } from '../tailscale/services/tailscale';
import { TrustedNetworksService } from '../trusted-networks';
import { DashboardPasswordService } from '../web-auth/services/dashboard-password.service';
import { WebSessionsService } from '../web-auth/services/web-sessions.service';
import { WEB_UI_ICON, WEB_UI_MODULE } from './constants/web-ui';
import { WEB_UI_SETTINGS } from './constants/web-ui-settings';
import { buildDevicesPage } from './pages/devices-page';
import { buildLoginPage } from './pages/login-page';
import { buildNetworksPage } from './pages/networks-page';
import { buildOverviewPage } from './pages/overview-page';
import type { WebUiAddress, WebUiSnapshot } from './types/web-ui-snapshot.types';

/**
 * Модуль «Web UI»: усе про вебінтерфейс в одному місці — адреси, збірка, вхід, довірені мережі, пристрої.
 * Нових даних не заводить: читає сервіси, які ними вже володіють.
 */
@Injectable()
export class WebUiMacModule implements MacModule {
  readonly id = WEB_UI_MODULE;
  readonly title = 'Web UI';
  readonly description = 'Вебінтерфейс MaControl: де він відкривається, хто увійшов і які пристрої сполучені.';
  readonly icon = WEB_UI_ICON;
  readonly permissions: MacModule['permissions'] = [];
  readonly settings: MacModule['settings'] = WEB_UI_SETTINGS;

  constructor(
    @Inject(AGENT_CONFIG) private readonly _config: AgentConfig,
    private readonly _networks: TrustedNetworksService,
    private readonly _tailscale: TailscaleService,
    private readonly _password: DashboardPasswordService,
    private readonly _sessions: WebSessionsService,
    private readonly _pairing: PairingService,
    private readonly _secrets: AppSecretsService,
    private readonly _devicesBridge: DevicesBridgeService,
  ) {}

  pages(ctx: ModuleContext): UiPage[] {
    const snapshot = this._snapshot(ctx);
    return [buildOverviewPage(snapshot, ctx.settingNode('heartbeat')), buildLoginPage(snapshot), buildNetworksPage(snapshot), buildDevicesPage(this._devicesBridge.snapshot())];
  }

  private _snapshot(ctx: ModuleContext): WebUiSnapshot {
    const devices = this._pairing.devices();
    const byId = new Map(devices.map((device) => [device.id, device]));
    return {
      addresses: this._addresses(),
      web: readWebInfo(this._config.webPublishedDir, this._config.webDir),
      passwordSet: this._password.isSet,
      passwordSource: this._secrets.keys.find((key) => key.name === 'MACONTROL_DASHBOARD_PASSWORD')?.source ?? null,
      jwtKey: {
        configured: !!this._secrets.get('jwtKey'),
        source: this._secrets.keys.find((key) => key.name === 'MACONTROL_JWT_KEY')?.source ?? null,
      },
      sessions: this._sessions.active().map((session) => ({
        id: session.id,
        deviceName: byId.has(session.deviceId) ? describeUserAgent(byId.get(session.deviceId)!.userAgent) : 'Невідомий пристрій',
        via: byId.get(session.deviceId)?.via ?? 'local',
        lastActiveAt: session.lastActiveAt,
        expiresAt: session.expiresAt,
      })),
      trustedNetworks: this._networks.list(),
      currentSsid: ctx.mac?.ssid ?? null,
      remoteStore: {
        configured: !!(this._secrets.get('upstashUrl') && this._secrets.get('upstashToken')),
        source: this._secrets.keys.find((key) => key.name === 'UPSTASH_REDIS_REST_URL')?.source ?? null,
      },
      devices: devices.map((device) => ({
        id: device.id,
        name: describeUserAgent(device.userAgent),
        via: device.via,
        createdAt: device.createdAt,
        lastSeenAt: device.lastSeenAt,
      })),
      pendingRequests: this._pairing.pendingRequests().length,
    };
  }

  private _addresses(): WebUiAddress[] {
    const { httpPort, dashboardOrigins } = this._config;
    const lan = findLanAddress();
    const trusted = this._networks.isCurrentTrusted;
    const { dnsName } = this._tailscale.state;
    const tailnet = this._tailscale.isServing && dnsName ? `https://${dnsName}` : null;
    return [
      { id: 'mac', label: 'На цьому Mac', symbol: 'desktopcomputer', url: `http://127.0.0.1:${httpPort}`, note: 'Працює завжди, поки запущений сервер.' },
      {
        id: 'lan',
        label: 'У локальній мережі',
        symbol: 'wifi',
        url: trusted && lan ? `http://${lan}:${httpPort}` : null,
        note: trusted ? (lan ? 'Mac у довіреній Wi-Fi.' : 'Немає мережі.') : 'Mac не в довіреній Wi-Fi.',
      },
      {
        id: 'tailnet',
        label: 'Tailscale',
        symbol: 'point.3.connected.trianglepath.dotted',
        url: tailnet,
        note: tailnet ? 'З будь-якої мережі, лише пристрої твого tailnet.' : 'Tailscale serve вимкнено.',
      },
      {
        id: 'vercel',
        label: 'Vercel',
        symbol: 'cloud.fill',
        url: dashboardOrigins[0] ?? null,
        note: 'Лише перегляд стану; керування — за адресами вище.',
      },
    ];
  }
}
