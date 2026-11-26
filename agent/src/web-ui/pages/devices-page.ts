import type { DevicePairing, DevicePairingMode, DevicesSnapshot, UiNode, UiPage } from '@awake/contracts';
import { menuItem } from '../../modules/helpers/menu-item';
import { MAC_ONLY_HINT, WEB_UI_MODULE } from '../constants/web-ui';
import { formatWhen } from '../helpers/format-when';
import { webUiAction } from '../helpers/web-ui-action';

/** Канал сполучення: як він зветься у фільтрі, його провайдер і як з нього заходять. */
interface PairingChannel {
  mode: DevicePairingMode;
  tab: string;
  provider: string;
  icon: { symbol: string; tone: 'accent' | 'indigo' | 'gray' };
  hint: string;
}

const CHANNELS: PairingChannel[] = [
  { mode: 'local', tab: 'Local', provider: 'Довірена Wi-Fi', icon: { symbol: 'wifi', tone: 'accent' }, hint: 'Відкрий на телефоні або ноуті в тій самій Wi-Fi.' },
  {
    mode: 'tailnet',
    tab: 'Priv',
    provider: 'Tailscale',
    icon: { symbol: 'point.3.connected.trianglepath.dotted', tone: 'accent' },
    hint: 'Відкрий з будь-якої мережі на своєму пристрої з Tailscale.',
  },
  {
    mode: 'remote',
    tab: 'Proxy',
    provider: 'Webhooxy',
    icon: { symbol: 'antenna.radiowaves.left.and.right', tone: 'indigo' },
    hint: 'Відкрий з будь-якої мережі: вхід іде через Web UI на Vercel.',
  },
];

/** Чому в каналу зараз немає посилання — словом для статусу і реченням для коментаря. */
const UNAVAILABLE: Record<string, { status: string; text: string }> = {
  untrusted: { status: 'Недоступно', text: 'Mac не в довіреній Wi-Fi. Додай мережу на сторінці «Мережі» або обери Priv.' },
  noNetwork: { status: 'Недоступно', text: 'Mac не в мережі: немає адреси, за якою пристрій міг би його знайти.' },
  tailnetOff: { status: 'Вимкнено', text: 'Tailscale не запущений на Mac або вимкнений: увімкни модуль Tailscale.' },
  disabled: { status: 'Вимкнено', text: 'Webhooxy вимкнено на сервері.' },
  relayOff: { status: 'Не підключено', text: 'Webhooxy не підключений: увімкни його в Агент → Огляд → Віддалений доступ.' },
};

/**
 * «Пристрої»: фільтр каналу (Local | Priv | Proxy) вгорі прилипає і керує всім нижче — QR для нового пристрою,
 * сполучені пристрої і запити цього каналу. QR, код і відповідь на запит — лише на Mac (scope mac): одноразовий код
 * з Mac не виходить, а сполучений пристрій не керує іншими.
 */
export function buildDevicesPage(devices: DevicesSnapshot): UiPage {
  return {
    id: 'webui-devices',
    module: WEB_UI_MODULE,
    title: 'Пристрої',
    icon: { symbol: 'laptopcomputer.and.iphone', tone: 'gray' },
    group: 'modules',
    scope: 'local',
    children: [
      {
        id: 'webui-devices-channel',
        type: 'tabs',
        sticky: true,
        value: CHANNELS.find((channel) => devices.pairing[channel.mode].url)?.mode ?? 'local',
        tabs: CHANNELS.map((channel) => ({
          id: channel.mode,
          label: channel.tab,
          children: channelNodes(channel, devices),
        })),
      },
    ],
  };
}

function channelNodes(channel: PairingChannel, snapshot: DevicesSnapshot): UiNode[] {
  const pairing = snapshot.pairing[channel.mode];
  const devices = snapshot.devices.filter((device) => device.via === channel.mode);
  const requests = snapshot.requests.filter((request) => request.via === channel.mode);
  const unavailable =
    'reason' in pairing && pairing.reason ? (UNAVAILABLE[pairing.reason] ?? { status: 'Недоступно', text: 'Посилання зараз недоступне.' }) : null;
  return [
    {
      id: `webui-devices-${channel.mode}-provider`,
      type: 'section',
      children: [
        {
          id: `webui-devices-${channel.mode}-provider-bar`,
          type: 'item',
          title: channel.provider,
          icon: channel.icon,
          status: unavailable ? { label: unavailable.status, tone: 'gray' } : { label: 'Працює', tone: 'green' },
          comment: unavailable?.text ?? channel.hint,
        },
      ],
    },
    pairingSection(channel, pairing),
    {
      id: `webui-devices-${channel.mode}-paired`,
      type: 'section',
      title: 'Сполучені пристрої',
      children: devices.length
        ? devices.map(
            (device): UiNode => ({
              id: `webui-device-${device.id}`,
              type: 'item',
              title: device.name,
              icon: { symbol: 'laptopcomputer.and.iphone', tone: 'gray' },
              status: { label: 'Сполучено', tone: 'green' },
              comment: `Сполучено ${formatWhen(device.createdAt)} · ${device.lastSeenAt ? `заходив ${formatWhen(device.lastSeenAt)}` : 'ще не заходив'}`,
              actions: [
                menuItem(`webui-device-revoke-${device.id}`, 'Відкликати', webUiAction('revokeDevice', { id: device.id }), {
                  variant: 'danger',
                  scope: 'mac',
                  hint: MAC_ONLY_HINT,
                  confirm: {
                    title: 'Відкликати пристрій?',
                    text: 'Пристрій одразу втратить доступ до Web UI. Щоб повернути, його доведеться сполучити знову.',
                    ok: 'Відкликати',
                  },
                }),
              ],
            }),
          )
        : [{ id: `webui-devices-${channel.mode}-paired-empty`, type: 'text', text: 'У цьому каналі пристроїв немає.', tone: 'gray' }],
    },
    {
      id: `webui-devices-${channel.mode}-requests`,
      type: 'section',
      title: 'Запити на сполучення',
      footer: 'Пристрій відкрив посилання з QR і чекає. Токен він отримає лише після «Дозволити».',
      children: requests.length
        ? requests.map(
            (request): UiNode => ({
              id: `webui-pairing-request-${request.id}`,
              type: 'item',
              title: request.name,
              icon: { symbol: 'questionmark.circle', tone: 'orange' },
              status: { label: 'Чекає', tone: 'orange', pulse: true },
              comment: `Запит ${formatWhen(request.createdAt)} · згасне ${formatWhen(request.expiresAt)}`,
              actions: [
                menuItem(`webui-pairing-allow-${request.id}`, 'Дозволити', webUiAction('answerPairing', { id: request.id, approve: true }), {
                  variant: 'accent',
                  scope: 'mac',
                  hint: MAC_ONLY_HINT,
                }),
                menuItem(`webui-pairing-deny-${request.id}`, 'Відхилити', webUiAction('answerPairing', { id: request.id, approve: false }), {
                  variant: 'danger',
                  scope: 'mac',
                  hint: MAC_ONLY_HINT,
                }),
              ],
            }),
          )
        : [{ id: `webui-devices-${channel.mode}-requests-empty`, type: 'text', text: 'Запитів немає.', tone: 'gray' }],
    },
  ];
}

/** «Сполучити новий»: QR, відлік коду з «Новий код» і посилання. Лише на Mac. */
function pairingSection(channel: PairingChannel, pairing: DevicePairing): UiNode {
  const id = `webui-devices-${channel.mode}-pair`;
  const children: UiNode[] =
    pairing.url && 'expiresAt' in pairing
      ? [
          { id: `${id}-qr`, type: 'qr', value: pairing.url, expiresAt: pairing.expiresAt },
          {
            id: `${id}-code`,
            type: 'row',
            label: 'Код діє',
            countdownTo: pairing.expiresAt,
            control: {
              type: 'button',
              button: { id: `${id}-new-code`, label: 'Новий код', variant: 'plain', action: webUiAction('newPairingCode', {}) },
            },
          },
          { id: `${id}-link`, type: 'item', title: 'Посилання', copy: { value: pairing.url } },
        ]
      : [{ id: `${id}-none`, type: 'text', text: 'Посилання зараз недоступне: причина вище.', tone: 'gray' }];
  return {
    id,
    type: 'section',
    title: 'Сполучити новий',
    scope: 'mac',
    footer: 'Код одноразовий. Токен пристрій отримає лише після «Дозволити».',
    children,
  };
}
