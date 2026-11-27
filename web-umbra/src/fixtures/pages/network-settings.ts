import type { UiChart, UiChartPoint, UiMenuItem, UiNode, UiPage, UiRow, UiTone } from '@awake/contracts';
import { bucketsAgo, inMinutes } from '../time';

/*
 * Static SDUI pages for the network / settings tabs, as the agent builds them for a realistic state:
 * webhooxy online with one proxy session, Tailscale up on mac.tail1234.ts.net, two paired devices,
 * one trusted network (HomeNet). Mirrors agent/src/{relay,tailscale,web-ui}/pages and the page-less settings
 * of modules.service.ts. All addresses, hosts, codes and ids are fake. Times are relative (inMinutes / bucketsAgo).
 */

const MAC_ONLY_HINT = 'Змінити можна лише в аппці на Mac.';

/** Той самий формат, що `formatWhen` / `formatSessionStart` у агенті (uk-UA, час Mac). */
const WHEN = new Intl.DateTimeFormat('uk-UA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const formatWhen = (iso: string): string => WHEN.format(new Date(iso));

const webUiAction = (name: string, params: Record<string, string | number | boolean>) => ({ module: 'webui', name, params });

/* ---------- Web UI: «Огляд» ---------- */

function webUiOverviewPage(): UiPage {
  const addressItem = (
    id: string,
    title: string,
    symbol: string,
    url: string | null,
  ): UiNode => ({
    id: `webui-address-${id}`,
    type: 'item',
    title,
    icon: { symbol, tone: 'accent' },
    status: url ? { label: 'Працює', tone: 'green' } : { label: 'Недоступно', tone: 'gray' },
    ...(url ? { copy: { value: url } } : {}),
  });
  return {
    id: 'webui',
    module: 'webui',
    title: 'Web UI',
    icon: { symbol: 'globe', tone: 'indigo' },
    group: 'modules',
    scope: 'local',
    children: [
      {
        id: 'webui-addresses-local',
        type: 'section',
        title: 'Local',
        footer: 'У локальній мережі сервер відповідає лише в довіреній Wi-Fi. Список мереж — на сторінці «Мережі».',
        children: [
          addressItem('mac', 'Цей Mac', 'laptopcomputer', 'http://127.0.0.1:47800'),
          addressItem('lan', 'Домашня Wi-Fi', 'wifi', 'https://192.168.1.5:47800'),
        ],
      },
      {
        id: 'webui-addresses-priv',
        type: 'section',
        title: 'Priv · Tailscale',
        footer: 'Лише пристрої твого tailnet, з будь-якої мережі.',
        children: [addressItem('tailnet', 'Tailnet', 'point.3.connected.trianglepath.dotted', 'https://mac.tail1234.ts.net')],
      },
      {
        id: 'webui-addresses-proxy',
        type: 'section',
        title: 'Proxy · Vercel',
        footer: 'Перегляд стану з будь-якої мережі; керування — через канали вище.',
        children: [addressItem('vercel', 'Vercel', 'globe', 'https://webui.example.test')],
      },
      {
        id: 'webui-build',
        type: 'section',
        title: 'Збірка',
        footer: 'Нову збірку публікує scripts/publish-web-local.sh: сервер віддає її одразу. Без публікації — збірка з аппки.',
        children: [
          {
            id: 'webui-build-source',
            type: 'row',
            label: 'Звідки',
            value: 'Опублікована окремо',
            hint: `Зібрано ${formatWhen(bucketsAgo(3, 'hour'))}`,
            icon: { symbol: 'shippingbox.fill', tone: 'indigo' },
          },
        ],
      },
    ],
  };
}

/* ---------- Web UI: «Мережі» ---------- */

function webUiNetworksPage(): UiPage {
  const removeHomeNet: UiMenuItem = {
    id: 'webui-network-remove-0',
    label: 'Прибрати',
    action: webUiAction('removeNetwork', { ssid: 'HomeNet' }),
    variant: 'danger',
    scope: 'mac',
    hint: MAC_ONLY_HINT,
    confirm: {
      title: 'Прибрати мережу?',
      text: 'Поза довіреними мережами сервер відповідатиме лише цьому Mac.',
      ok: 'Прибрати',
    },
  };
  const editUpstash: UiMenuItem = {
    id: 'webui-remote-store-edit',
    label: 'Змінити',
    action: webUiAction('setRemoteStore', {}),
    variant: 'default',
    scope: 'mac',
    hint: MAC_ONLY_HINT,
    disabled: true,
    form: {
      title: 'Upstash',
      submit: 'Зберегти',
      fields: [
        { name: 'url', label: 'REST URL', kind: 'url', placeholder: 'https://….upstash.io', required: true },
        { name: 'token', label: 'REST токен', kind: 'password', placeholder: 'задано, лишити' },
      ],
    },
  };
  return {
    id: 'webui-networks',
    module: 'webui',
    title: 'Мережі',
    icon: { symbol: 'wifi', tone: 'accent' },
    group: 'modules',
    scope: 'local',
    children: [
      {
        id: 'webui-trusted',
        type: 'section',
        title: 'Довірені мережі Wi-Fi',
        footer: `Поза довіреними мережами сервер відповідає тільки цьому Mac. ${MAC_ONLY_HINT}`,
        children: [
          {
            id: 'webui-network-0',
            type: 'item',
            title: 'HomeNet',
            icon: { symbol: 'checkmark.shield.fill', tone: 'green' },
            status: { label: 'Довірена', tone: 'green' },
            comment: 'Зараз тут',
            actions: [removeHomeNet],
          },
        ],
      },
      {
        id: 'webui-remote-store',
        type: 'section',
        title: 'Remote KV Store',
        footer: 'Сюди сервер кладе живий стан для Web UI на Vercel. Історія і журнал лишаються на Mac.',
        children: [
          {
            id: 'webui-remote-store-upstash',
            type: 'item',
            title: 'Upstash',
            icon: { symbol: 'externaldrive.connected.to.line.below.fill', tone: 'indigo' },
            status: { label: 'Підключено', tone: 'green' },
            tags: [{ label: 'з Envify', tone: 'gray' }],
            comment: 'Ключі прийшли з конфігу; форма їх не перебиває.',
            actions: [editUpstash],
          },
        ],
      },
    ],
  };
}

/* ---------- Web UI: «Пристрої» ---------- */

interface Channel {
  mode: 'local' | 'tailnet' | 'remote';
  tab: string;
  provider: string;
  icon: { symbol: string; tone: UiTone };
  hint: string;
  url: string;
  device: { id: number; name: string; createdAt: string; lastSeenAt: string | null } | null;
}

const CHANNELS: Channel[] = [
  {
    mode: 'local',
    tab: 'Local',
    provider: 'Довірена Wi-Fi',
    icon: { symbol: 'wifi', tone: 'accent' },
    hint: 'Відкрий на телефоні або ноуті в тій самій Wi-Fi.',
    url: 'https://192.168.1.5:47800/pair#FAKE-LOCAL-CODE',
    device: { id: 1, name: 'iPhone', createdAt: inMinutes(-60 * 24 * 3), lastSeenAt: inMinutes(-12) },
  },
  {
    mode: 'tailnet',
    tab: 'Priv',
    provider: 'Tailscale',
    icon: { symbol: 'point.3.connected.trianglepath.dotted', tone: 'accent' },
    hint: 'Відкрий з будь-якої мережі на своєму пристрої з Tailscale.',
    url: 'https://mac.tail1234.ts.net/pair#FAKE-TAILNET-CODE',
    device: { id: 2, name: 'MacBook', createdAt: inMinutes(-60 * 24 * 10), lastSeenAt: inMinutes(-180) },
  },
  {
    mode: 'remote',
    tab: 'Proxy',
    provider: 'Webhooxy',
    icon: { symbol: 'antenna.radiowaves.left.and.right', tone: 'indigo' },
    hint: 'Відкрий з будь-якої мережі: вхід іде через Web UI на Vercel.',
    url: 'https://webui.example.test/pair#FAKE-REMOTE-CODE',
    device: null,
  },
];

function channelNodes(channel: Channel): UiNode[] {
  const id = `webui-devices-${channel.mode}`;
  const expiresAt = inMinutes(4);
  return [
    {
      id: `${id}-provider`,
      type: 'section',
      children: [
        {
          id: `${id}-provider-bar`,
          type: 'item',
          title: channel.provider,
          icon: channel.icon,
          status: { label: 'Працює', tone: 'green' },
          comment: channel.hint,
        },
      ],
    },
    {
      id: `${id}-pair`,
      type: 'section',
      title: 'Сполучити новий',
      scope: 'mac',
      footer: 'Код одноразовий. Токен пристрій отримає лише після «Дозволити».',
      children: [
        { id: `${id}-pair-qr`, type: 'qr', value: channel.url, expiresAt },
        {
          id: `${id}-pair-code`,
          type: 'row',
          label: 'Код діє',
          countdownTo: expiresAt,
          control: {
            type: 'button',
            button: { id: `${id}-pair-new-code`, label: 'Новий код', variant: 'plain', action: webUiAction('newPairingCode', {}) },
          },
        },
        { id: `${id}-pair-link`, type: 'item', title: 'Посилання', copy: { value: channel.url } },
      ],
    },
    {
      id: `${id}-paired`,
      type: 'section',
      title: 'Сполучені пристрої',
      children: channel.device
        ? [
            {
              id: `webui-device-${channel.device.id}`,
              type: 'item',
              title: channel.device.name,
              icon: { symbol: 'laptopcomputer.and.iphone', tone: 'gray' },
              status: { label: 'Сполучено', tone: 'green' },
              comment: `Сполучено ${formatWhen(channel.device.createdAt)} · ${
                channel.device.lastSeenAt ? `заходив ${formatWhen(channel.device.lastSeenAt)}` : 'ще не заходив'
              }`,
              actions: [
                {
                  id: `webui-device-revoke-${channel.device.id}`,
                  label: 'Відкликати',
                  action: webUiAction('revokeDevice', { id: channel.device.id }),
                  variant: 'danger',
                  scope: 'mac',
                  hint: MAC_ONLY_HINT,
                  confirm: {
                    title: 'Відкликати пристрій?',
                    text: 'Пристрій одразу втратить доступ до Web UI. Щоб повернути, його доведеться сполучити знову.',
                    ok: 'Відкликати',
                  },
                },
              ],
            },
          ]
        : [{ id: `${id}-paired-empty`, type: 'text', text: 'У цьому каналі пристроїв немає.', tone: 'gray' }],
    },
    {
      id: `${id}-requests`,
      type: 'section',
      title: 'Запити на сполучення',
      footer: 'Пристрій відкрив посилання з QR і чекає. Токен він отримає лише після «Дозволити».',
      children: [{ id: `${id}-requests-empty`, type: 'text', text: 'Запитів немає.', tone: 'gray' }],
    },
  ];
}

function webUiDevicesPage(): UiPage {
  return {
    id: 'webui-devices',
    module: 'webui',
    title: 'Пристрої',
    icon: { symbol: 'laptopcomputer.and.iphone', tone: 'gray' },
    group: 'modules',
    scope: 'local',
    children: [
      {
        id: 'webui-devices-channel',
        type: 'tabs',
        sticky: true,
        value: 'local',
        tabs: CHANNELS.map((channel) => ({ id: channel.mode, label: channel.tab, children: channelNodes(channel) })),
      },
    ],
  };
}

/* ---------- Webhooxy (relay) ---------- */

const relayEnabled: UiNode = {
  id: 'relay.enabled',
  type: 'switch',
  module: 'relay',
  key: 'enabled',
  label: 'Увімкнено',
  hint: 'Керування з Web UI поза домашньою мережею',
  icon: { symbol: 'antenna.radiowaves.left.and.right', tone: 'accent' },
  scope: 'mac',
  value: true,
};

function relayPage(): UiPage {
  return {
    id: 'relay',
    module: 'relay',
    title: 'Webhooxy',
    icon: { symbol: 'antenna.radiowaves.left.and.right', tone: 'accent' },
    group: 'modules',
    scope: 'mac',
    children: [
      {
        id: 'host',
        type: 'section',
        title: 'Host',
        footer:
          'Проксі до Web UI: агент тримає кімнату в webhooxy, Web UI підключається до неї за квитком. Працює, коли модуль увімкнено і на Огляді Агента ввімкнено «Webhooxy».',
        children: [
          relayEnabled,
          {
            id: 'status',
            type: 'item',
            title: 'Host',
            status: { label: 'Активний', tone: 'green', pulse: false },
          },
          { id: 'viewers', type: 'row', label: 'Сесій зараз', value: '1' },
          { id: 'url', type: 'row', label: 'URL', value: 'https://webhooxy.example.test', hint: 'stage dev' },
        ],
      },
    ],
  };
}

/** Ключі select-ів лімітів: значення, підписи і те, що діє в webhooxy (`effective`). */
const LIMIT_EFFECTIVE = { maxViewers: 5, maxPayloadBytes: 524288, sendTimeoutMs: 10000, viewerSend: { ratePerSec: 10, queueSize: 50 }, hostBroadcast: { ratePerSec: 30 } };

function relayLimitsPage(): UiPage {
  const select = (
    key: string,
    label: string,
    icon: string,
    value: string,
    options: { value: string; label: string }[],
    effective: string,
    hint?: string,
  ): UiNode => ({
    id: `relay.${key}`,
    type: 'select',
    module: 'relay',
    key,
    label,
    ...(hint ? { hint } : {}),
    icon: { symbol: icon, tone: 'accent' },
    scope: 'mac',
    value,
    options,
  });
  return {
    id: 'relay-limits',
    module: 'relay',
    title: 'Ліміти',
    icon: { symbol: 'slider.horizontal.3', tone: 'accent' },
    group: 'modules',
    scope: 'mac',
    children: [
      {
        id: 'limits',
        type: 'section',
        title: 'Ліміти кімнати',
        footer: 'Діють одразу, без перепідключення. «Як у webhooxy» — поле не передається.',
        children: [
          select(
            'limits.maxViewers',
            'Viewer-ів у кімнаті',
            'person.2.fill',
            '5',
            ['1', '2', '5', '10', '20'].map((value) => ({ value, label: value })),
            `Діє: ${LIMIT_EFFECTIVE.maxViewers}`,
          ),
          select(
            'limits.maxPayloadBytes',
            'Найбільше повідомлення',
            'shippingbox.fill',
            '524288',
            [
              { value: '262144', label: '256 КБ' },
              { value: '524288', label: '512 КБ' },
              { value: '1000000', label: '1 МБ' },
            ],
            `Діє: ${LIMIT_EFFECTIVE.maxPayloadBytes}`,
            'Дерево агента має вміщатися',
          ),
          select(
            'limits.sendTimeoutMs',
            'Чекати відповідь агента',
            'timer',
            'default',
            [
              { value: 'default', label: 'Як у webhooxy (10 с)' },
              { value: '5000', label: '5 с' },
              { value: '30000', label: '30 с' },
              { value: '60000', label: '60 с' },
            ],
            `Діє: ${LIMIT_EFFECTIVE.sendTimeoutMs}`,
          ),
          select(
            'limits.viewerSend.ratePerSec',
            'Подій від viewer-а за секунду',
            'speedometer',
            'default',
            [
              { value: 'default', label: 'Як у webhooxy (10)' },
              { value: '5', label: '5' },
              { value: '20', label: '20' },
              { value: '50', label: '50' },
            ],
            `Діє: ${LIMIT_EFFECTIVE.viewerSend.ratePerSec}`,
          ),
          select(
            'limits.viewerSend.queueSize',
            'Черга подій viewer-а',
            'list.number',
            'default',
            [
              { value: 'default', label: 'Як у webhooxy (50)' },
              { value: '0', label: '0' },
              { value: '20', label: '20' },
              { value: '100', label: '100' },
              { value: '200', label: '200' },
            ],
            `Діє: ${LIMIT_EFFECTIVE.viewerSend.queueSize}`,
            'Скільки подій чекають, поки агент зайнятий; 0 — без черги',
          ),
          select(
            'limits.hostBroadcast.ratePerSec',
            'Розсилок дерева за секунду',
            'dot.radiowaves.left.and.right',
            'default',
            [
              { value: 'default', label: 'Як у webhooxy (30)' },
              { value: '10', label: '10' },
              { value: '60', label: '60' },
              { value: '100', label: '100' },
            ],
            `Діє: ${LIMIT_EFFECTIVE.hostBroadcast.ratePerSec}`,
          ),
        ],
      },
    ],
  };
}

/* Трекінг: спільний лейаут статистики (buildStatsPage). Точки — фіксовані, часи відносні. */

type Period = 'today' | 'days' | 'weeks' | 'months';
type Unit = 'hour' | 'day' | 'week' | 'month';

const PERIOD_TABS: { value: Period; label: string; unit: Unit }[] = [
  { value: 'today', label: 'Сьогодні', unit: 'hour' },
  { value: 'days', label: 'Дні', unit: 'day' },
  { value: 'weeks', label: 'Тижні', unit: 'week' },
  { value: 'months', label: 'Місяці', unit: 'month' },
];

/** Лічильники за кожен період: від найстаршого бакета до найновішого. */
const TRACKING: Record<Period, { actions: number[]; messages: number[]; allowed: number[]; denied: number[]; connects: number[]; errors: number[] }> = {
  today: {
    actions: [0, 2, 5, 1, 0, 3, 4, 2],
    messages: [0, 6, 22, 4, 0, 9, 18, 7],
    allowed: [0, 1, 2, 1, 0, 1, 2, 1],
    denied: [0, 0, 1, 0, 0, 0, 0, 0],
    connects: [0, 1, 1, 0, 0, 1, 1, 0],
    errors: [0, 0, 0, 1, 0, 0, 0, 0],
  },
  days: {
    actions: [4, 7, 3, 0, 0, 5, 6, 8, 2, 9, 4, 3, 6, 5],
    messages: [30, 52, 18, 0, 0, 41, 60, 33, 12, 70, 28, 25, 44, 39],
    allowed: [3, 4, 2, 0, 0, 4, 5, 6, 2, 7, 3, 3, 4, 4],
    denied: [0, 1, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0],
    connects: [1, 2, 1, 0, 0, 2, 1, 2, 1, 2, 1, 1, 2, 1],
    errors: [0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0],
  },
  weeks: {
    actions: [21, 34, 18, 27, 40, 12],
    messages: [140, 210, 96, 180, 230, 70],
    allowed: [18, 25, 12, 22, 28, 9],
    denied: [1, 2, 0, 1, 3, 0],
    connects: [5, 7, 4, 6, 8, 3],
    errors: [0, 1, 0, 0, 2, 0],
  },
  months: {
    actions: [120, 160, 95, 210],
    messages: [700, 820, 540, 990],
    allowed: [90, 110, 70, 140],
    denied: [4, 6, 2, 8],
    connects: [18, 22, 15, 26],
    errors: [1, 3, 0, 2],
  },
};

/** Початок бакета, `ago` одиниць тому. Тиждень і місяць — кроки по днях (без вирівнювання). */
function bucketStart(ago: number, unit: Unit): string {
  if (unit === 'hour') return bucketsAgo(ago, 'hour');
  if (unit === 'day') return bucketsAgo(ago, 'day');
  return bucketsAgo(ago * (unit === 'week' ? 7 : 30), 'day');
}

function points(values: number[], unit: Unit, series?: string): UiChartPoint[] {
  return values.map((value, i) => ({
    start: bucketStart(values.length - 1 - i, unit),
    value,
    ...(series ? { series } : {}),
  }));
}

function sumOf(chartPoints: UiChartPoint[]): number {
  return chartPoints.reduce((sum, point) => sum + point.value, 0);
}

function trackingPeriodNodes(period: Period, unit: Unit): UiNode[] {
  const data = TRACKING[period];
  const charts: { id: string; title: string; chart: UiChart; total: boolean }[] = [];
  const add = (id: string, title: string, style: { tone?: UiTone; tones?: Record<string, UiTone> }, chartPoints: UiChartPoint[]) => {
    charts.push({
      id,
      title,
      total: true,
      chart: { id: `relay-tracking-${id}-${period}`, type: 'chart', title, unit, format: 'count', points: chartPoints, ...style },
    });
  };
  add('actions', 'Дій через webhooxy', { tone: 'accent' }, points(data.actions, unit));
  add('messages', 'Повідомлень від viewer-ів', { tone: 'accent' }, points(data.messages, unit));
  add(
    'viewers',
    'Viewer-и',
    { tones: { Пущено: 'green', 'Не пущено': 'orange' } },
    [...points(data.allowed, unit, 'Пущено'), ...points(data.denied, unit, 'Не пущено')],
  );
  add('connects', 'Підключень host-а', { tone: 'indigo' }, points(data.connects, unit));
  add('errors', 'Помилок', { tone: 'red' }, points(data.errors, unit));

  const totals: UiRow[] = charts.map(({ id, title, chart }) => ({
    id: `relay-tracking-total-${id}-${period}`,
    type: 'row',
    label: title,
    value: String(sumOf(chart.points)),
  }));
  return [
    {
      id: `relay-tracking-summary-${period}`,
      type: 'section',
      title: 'Підсумок',
      children: totals,
    },
    {
      id: `relay-tracking-charts-${period}`,
      type: 'section',
      title: 'Графіки',
      children: charts.map(({ chart }) => chart),
    },
  ];
}

function relayTrackingPage(): UiPage {
  return {
    id: 'relay-tracking',
    module: 'relay',
    title: 'Трекінг',
    icon: { symbol: 'chart.bar.fill', tone: 'accent' },
    group: 'modules',
    scope: 'mac',
    children: [
      {
        id: 'relay-tracking-period',
        type: 'tabs',
        sticky: true,
        value: 'today',
        setting: { module: 'relay', key: 'statsPeriod' },
        tabs: PERIOD_TABS.map(({ value, label, unit }) => ({ id: value, label, children: trackingPeriodNodes(value, unit) })),
      },
    ],
  };
}

function relaySessionsPage(): UiPage {
  return {
    id: 'relay-sessions',
    module: 'relay',
    title: 'Сесії',
    icon: { symbol: 'person.2.fill', tone: 'accent' },
    group: 'modules',
    scope: 'mac',
    children: [
      {
        id: 'sessions',
        type: 'section',
        title: 'Сесії',
        children: [
          {
            id: 'viewers',
            type: 'list',
            items: [
              {
                id: 'v-7f3a',
                label: WHEN.format(new Date(inMinutes(-42))),
                hint: 'owner · https://webui.example.test · проксі webhooxy',
                value: 'proxy',
              },
            ],
            empty: 'Ще ніхто не підключався',
          },
        ],
      },
    ],
  };
}

/* ---------- Tailscale ---------- */

function tailscalePage(): UiPage {
  return {
    id: 'tailscale',
    module: 'tailscale',
    title: 'Tailscale',
    icon: { symbol: 'point.3.connected.trianglepath.dotted', tone: 'accent' },
    group: 'modules',
    scope: 'mac',
    children: [
      {
        id: 'tailscale',
        type: 'section',
        title: 'Tailscale',
        footer: 'Web UI і сполучення з твоїх пристроїв у tailnet з будь-якої мережі: https на *.ts.net через tailscale serve.',
        children: [
          {
            id: 'tailscale.enabled',
            type: 'item',
            title: 'Увімкнено',
            comment: 'Web UI з твоїх пристроїв у tailnet, з будь-якої мережі',
            status: { label: 'Працює', tone: 'green' },
            control: { type: 'switch', value: true, setting: { module: 'tailscale', key: 'enabled' } },
          },
          {
            id: 'host',
            type: 'item',
            title: 'Адреса',
            copy: { value: 'https://mac.tail1234.ts.net' },
          },
        ],
      },
    ],
  };
}

/* ---------- Налаштування (page-less settings of all modules) ---------- */

/**
 * У `_settingsPage()` лише налаштування без `page`. Із модулів цього стану таке є тільки в «Стан Mac»
 * (`metricsTracking`); решта має свою сторінку.
 */
function settingsPage(): UiPage {
  return {
    id: 'settings',
    module: 'host',
    title: 'Налаштування',
    icon: { symbol: 'gearshape.fill', tone: 'gray' },
    group: 'system',
    children: [
      {
        id: 'settings-system',
        type: 'section',
        title: 'Стан Mac',
        children: [
          {
            id: 'system.metricsTracking',
            type: 'select',
            module: 'system',
            key: 'metricsTracking',
            label: 'Заміри сервера і Mac',
            hint: "CPU, пам'ять, навантаження і нагрів раз на 10 с. Поза сесією графіки «Сервера» не поповнюються.",
            icon: { symbol: 'chart.xyaxis.line', tone: 'orange' },
            value: 'session',
            options: [
              { value: 'session', label: 'Лише під час сесії' },
              { value: 'always', label: 'Завжди' },
            ],
          },
        ],
      },
    ],
  };
}

/**
 * Сторінки мережі і налаштувань у порядку бічного меню: Web UI (Огляд, Мережі, Пристрої; «Вхід» пропущено),
 * Webhooxy (Host, Ліміти, Трекінг, Сесії), Tailscale, потім системні «Налаштування».
 */
export function networkSettingsPages(): UiPage[] {
  return [
    webUiOverviewPage(),
    webUiNetworksPage(),
    webUiDevicesPage(),
    relayPage(),
    relayLimitsPage(),
    relayTrackingPage(),
    relaySessionsPage(),
    tailscalePage(),
    settingsPage(),
  ];
}
