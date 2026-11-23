import type { SettingDefinition, UiOption } from '@awake/contracts';
import { RELAY_MAX_PAYLOAD_BYTES, RELAY_MAX_VIEWERS } from './relay-limits';

/** Значення select, з яким поле не передається: діє default webhooxy. */
export const RELAY_LIMIT_DEFAULT = 'default';

/** Id сторінки Webhooxy: ліміти хост не дублює на «Налаштуваннях». */
export const RELAY_PAGE = 'relay';
export const RELAY_LIMITS_PAGE = 'relay-limits';
export const RELAY_TRACKING_PAGE = 'relay-tracking';
export const RELAY_SESSIONS_PAGE = 'relay-sessions';

const fromWebhooxy = (label: string): UiOption => ({ value: RELAY_LIMIT_DEFAULT, label: `Як у webhooxy (${label})` });

/**
 * Перемикач модуля — на головній вкладці Webhooxy. Чи йде Web UI саме через нього, вибирають на Огляді Агента. Ліміти кімнати — select-и `limits.<поле RelayLimitsDef>` (docs/relay-contract.md),
 * webhooxy приймає їх у handshake і через `relay:limits` одразу, без перепідключення.
 */
export const RELAY_SETTINGS: SettingDefinition[] = [
  {
    type: 'switch',
    key: 'enabled',
    label: 'Увімкнено',
    hint: 'Керування з Web UI поза домашньою мережею',
    icon: { symbol: 'antenna.radiowaves.left.and.right', tone: 'accent' },
    scope: 'mac',
    page: RELAY_PAGE,
    default: false,
  },
  {
    type: 'select',
    key: 'limits.maxViewers',
    label: 'Viewer-ів у кімнаті',
    icon: { symbol: 'person.2.fill', tone: 'accent' },
    scope: 'mac',
    page: RELAY_LIMITS_PAGE,
    default: String(RELAY_MAX_VIEWERS),
    options: ['1', '2', '5', '10', '20'].map((value) => ({ value, label: value })),
  },
  {
    type: 'select',
    key: 'limits.maxPayloadBytes',
    label: 'Найбільше повідомлення',
    hint: 'Дерево агента має вміщатися',
    icon: { symbol: 'shippingbox.fill', tone: 'accent' },
    scope: 'mac',
    page: RELAY_LIMITS_PAGE,
    default: String(RELAY_MAX_PAYLOAD_BYTES),
    options: [
      { value: String(256 * 1024), label: '256 КБ' },
      { value: String(512 * 1024), label: '512 КБ' },
      { value: '1000000', label: '1 МБ' },
    ],
  },
  {
    type: 'select',
    key: 'limits.sendTimeoutMs',
    label: 'Чекати відповідь агента',
    icon: { symbol: 'timer', tone: 'accent' },
    scope: 'mac',
    page: RELAY_LIMITS_PAGE,
    default: RELAY_LIMIT_DEFAULT,
    options: [fromWebhooxy('10 с'), { value: '5000', label: '5 с' }, { value: '30000', label: '30 с' }, { value: '60000', label: '60 с' }],
  },
  {
    type: 'select',
    key: 'limits.viewerSend.ratePerSec',
    label: 'Подій від viewer-а за секунду',
    icon: { symbol: 'speedometer', tone: 'accent' },
    scope: 'mac',
    page: RELAY_LIMITS_PAGE,
    default: RELAY_LIMIT_DEFAULT,
    options: [fromWebhooxy('10'), ...['5', '20', '50'].map((value) => ({ value, label: value }))],
  },
  {
    type: 'select',
    key: 'limits.viewerSend.queueSize',
    label: 'Черга подій viewer-а',
    hint: 'Скільки подій чекають, поки агент зайнятий; 0 — без черги',
    icon: { symbol: 'list.number', tone: 'accent' },
    scope: 'mac',
    page: RELAY_LIMITS_PAGE,
    default: RELAY_LIMIT_DEFAULT,
    options: [fromWebhooxy('50'), ...['0', '20', '100', '200'].map((value) => ({ value, label: value }))],
  },
  {
    type: 'select',
    key: 'limits.hostBroadcast.ratePerSec',
    label: 'Розсилок дерева за секунду',
    icon: { symbol: 'dot.radiowaves.left.and.right', tone: 'accent' },
    scope: 'mac',
    page: RELAY_LIMITS_PAGE,
    default: RELAY_LIMIT_DEFAULT,
    options: [fromWebhooxy('30'), ...['10', '60', '100'].map((value) => ({ value, label: value }))],
  },
];

/** Ключі select-ів лімітів у порядку сторінки. */
export const RELAY_LIMIT_KEYS = RELAY_SETTINGS.filter((setting) => setting.key.startsWith('limits.')).map((setting) => setting.key);
