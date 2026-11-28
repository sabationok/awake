import type { UiAction, UiChart, UiChartPoint, UiConfirm, UiControl, UiIcon, UiMenuItem, UiNode, UiOption, UiPage, UiScope, UiSwitch, UiTone } from '@awake/contracts';
import { bucketsAgo, inMinutes } from '../time';

// Стан для фікстур: бот у Telegram працює, Mac онлайн (demo-mac), Tailscale увімкнено й віддає Web UI, Webhooxy
// вимкнено. Дві групи: «MaControl: демо-група» активна з трьома топіками, «Сімейний чат» неактивна. Дзеркалить
// builder-и агента (telegram/*, groups/*, modules/bot/*). Порядок сторінок — порядок модулів у ModulesModule.
// Значення, що залежать від часу, йдуть через inMinutes() / bucketsAgo(); ряди графіків рахуються при завантаженні.

type Period = 'today' | 'days' | 'weeks' | 'months';
type Buckets = Record<Period, string[]>;

const PERIODS: { value: Period; label: string }[] = [
  { value: 'today', label: 'Сьогодні' },
  { value: 'days', label: 'Дні' },
  { value: 'weeks', label: 'Тижні' },
  { value: 'months', label: 'Місяці' },
];
const UNIT: Record<Period, UiChart['unit']> = { today: 'hour', days: 'day', weeks: 'week', months: 'month' };
/** Скільки разів більше подій у ширшому періоді, ніж за годину. */
const SCALE: Record<Period, number> = { today: 1, days: 10, weeks: 70, months: 300 };
const LEAD_OPTIONS: UiOption[] = [
  { value: '5', label: '5 хв' },
  { value: '10', label: '10 хв' },
  { value: '15', label: '15 хв' },
  { value: '30', label: '30 хв' },
  { value: '60', label: '1 год' },
];

/** Час початку сесії, як formatSessionStart в агенті (локальна зона браузера). */
function sessionStart(iso: string): string {
  return new Date(iso).toLocaleString('uk-UA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

/** Початки бакетів для вкладок періоду: години й дні — від bucketsAgo, тижні й місяці — від початку дня з bucketsAgo. */
function buckets(): Buckets {
  const today = new Date(bucketsAgo(0, 'day'));
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  return {
    today: Array.from({ length: 24 }, (_, i) => bucketsAgo(23 - i, 'hour')),
    days: Array.from({ length: 24 }, (_, i) => bucketsAgo(23 - i, 'day')),
    weeks: Array.from({ length: 12 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() - 7 * (11 - i));
      return d.toISOString();
    }),
    months: Array.from({ length: 12 }, (_, i) => new Date(today.getFullYear(), today.getMonth() - (11 - i), 1).toISOString()),
  };
}

/** Детермінований демо-ряд навколо `base`: без випадкових чисел, щоб фікстура не стрибала між перезавантаженнями. */
function wave(n: number, base: number, seed: number): number[] {
  return Array.from({ length: n }, (_, i) => Math.max(0, Math.round(base + base * 0.6 * Math.sin(i * 0.9 + seed) + ((i + seed) % 3) - 1)));
}

/** Точки одного бакетного ряду за період; `series` — назва серії stacked-графіка (без неї — одна серія). */
function pts(b: Buckets, period: Period, base: number, seed: number, series?: string): UiChartPoint[] {
  const values = wave(b[period].length, base * SCALE[period], seed);
  return b[period].map((start, i) => ({ start, value: values[i], ...(series ? { series } : {}) }));
}

function sum(points: UiChartPoint[]): number {
  return points.reduce((total, point) => total + point.value, 0);
}

interface StatsChartSpec {
  id: string;
  title: string;
  tone?: UiTone;
  tones?: Record<string, UiTone>;
  /** Сума за період у «Підсумку»: `true` — під назвою графіка, рядок — під цим підписом. */
  total?: string | true;
  points: (period: Period) => UiChartPoint[];
}

interface StatsSectionSpec {
  id: string;
  title?: string;
  footer?: string;
  charts: StatsChartSpec[];
}

interface StatsPageSpec {
  id: string;
  module: string;
  title: string;
  icon: UiIcon;
  scope?: UiScope;
  periodKey?: string;
  footer?: string;
  sections: StatsSectionSpec[];
}

/** Сторінка статистики як buildStatsPage: вкладки періоду (statsPeriod), у кожній — «Підсумок» і секції графіків. */
function statsPage(spec: StatsPageSpec): UiPage {
  return {
    id: spec.id,
    module: spec.module,
    title: spec.title,
    icon: spec.icon,
    group: 'modules',
    ...(spec.scope ? { scope: spec.scope } : {}),
    children: [
      {
        id: `${spec.id}-period`,
        type: 'tabs',
        sticky: true,
        value: 'today',
        setting: { module: spec.module, key: spec.periodKey ?? 'statsPeriod' },
        tabs: PERIODS.map(({ value, label }) => ({ id: value, label, children: periodNodes(spec, value) })),
      },
    ],
  };
}

function periodNodes(spec: StatsPageSpec, period: Period): UiNode[] {
  const rows: UiNode[] = [];
  const sections = spec.sections.map(
    (section): UiNode => ({
      id: `${spec.id}-${section.id}-${period}`,
      type: 'section',
      ...(section.title ? { title: section.title } : {}),
      ...(section.footer ? { footer: section.footer } : {}),
      children: section.charts.map((chart): UiNode => {
        const points = chart.points(period);
        if (chart.total) {
          rows.push({
            id: `${spec.id}-total-${chart.id}-${period}`,
            type: 'row',
            label: typeof chart.total === 'string' ? chart.total : chart.title,
            value: String(sum(points)),
          });
        }
        return {
          id: `${spec.id}-${chart.id}-${period}`,
          type: 'chart',
          title: chart.title,
          format: 'count',
          unit: UNIT[period],
          points,
          ...(chart.tone ? { tone: chart.tone } : {}),
          ...(chart.tones ? { tones: chart.tones } : {}),
        };
      }),
    }),
  );
  const summary: UiNode = {
    id: `${spec.id}-summary-${period}`,
    type: 'section',
    title: 'Підсумок',
    ...(spec.footer ? { footer: spec.footer } : {}),
    children: rows,
  };
  return [summary, ...sections];
}

// ---------- Telegram ----------

function telegramPage(): UiPage {
  const since = inMinutes(-840);
  return {
    id: 'telegram',
    module: 'telegram',
    title: 'Telegram',
    icon: { symbol: 'paperplane.fill', tone: 'accent' },
    group: 'modules',
    children: [
      {
        id: 'bot',
        type: 'section',
        title: 'Бот',
        footer:
          'Кожен модуль має одну команду, далі все кнопками вглиб: /awake — сесія, /sleep → час або історія таймерів, /media → гучність і яскравість. /status — спільний стан Mac і модулів, /start — усі модулі.',
        children: [
          { id: 'telegram.bot', type: 'switch', module: 'telegram', key: 'bot', label: 'Бот у MaControl', hint: 'Команди й кнопки в Telegram', value: true },
          {
            id: 'run',
            type: 'item',
            title: 'Polling',
            status: { label: 'Працює', tone: 'green', pulse: true },
            comment: `з ${sessionStart(since)}`,
          },
        ],
      },
    ],
  };
}

/** Перемикач команди namespace-а: `hint` — опис модуля або «Лише кнопками з /start», коли команди немає. */
function commandSwitch(namespace: string, label: string, hint: string): UiSwitch {
  return { id: `telegram.commands.${namespace}`, type: 'switch', module: 'telegram', key: `commands.${namespace}`, label, hint, value: true };
}

function telegramCommandsPage(): UiPage {
  return {
    id: 'telegram-commands',
    module: 'telegram',
    title: 'Команди',
    icon: { symbol: 'command', tone: 'accent' },
    group: 'modules',
    children: [
      {
        id: 'commands',
        type: 'section',
        title: 'Команди Telegram',
        footer:
          'Вимкнений модуль зникає з меню команд і /start, а бот не виконує ні його команду, ні кнопки зі старих повідомлень. Mac, веб і webhooxy це не обмежує. /start і /help доступні завжди.',
        children: [
          commandSwitch('awake', '/awake', '☕️ Awake'),
          commandSwitch('sleep', '/sleep', '🌙 Sleeper'),
          commandSwitch('media', '/media', '🔊 Екран і звук'),
          commandSwitch('system', '/status', 'Стан Mac і модулів'),
          commandSwitch('relay', '/relay', '📡 Relay'),
          commandSwitch('bot', 'bot', 'Лише кнопками з /start'),
          commandSwitch('telegram', 'telegram', '⏳ Попередження про кінець'),
          commandSwitch('groups', '/groups', '👥 Групи'),
          commandSwitch('webui', 'webui', 'Лише кнопками з /start'),
          commandSwitch('permissions', 'permissions', 'Лише кнопками з /start'),
        ],
      },
    ],
  };
}

/** Перемикач події джерела (`events.<source>.<type>`) з іконкою події. */
function eventSwitch(source: string, type: string, label: string, icon: UiIcon, value = true): UiSwitch {
  return { id: `telegram.events.${source}.${type}`, type: 'switch', module: 'telegram', key: `events.${source}.${type}`, label, icon, value };
}

/** «Попереджати за» виду сесії (`events.ending.<kind>.lead`), стоїть у вкладці свого модуля. */
function leadSelect(kind: 'awake' | 'sleep'): UiNode {
  return {
    id: `telegram.events.ending.${kind}.lead`,
    type: 'select',
    module: 'telegram',
    key: `events.ending.${kind}.lead`,
    label: 'Попереджати за',
    value: '15',
    options: LEAD_OPTIONS,
  };
}

function telegramNotificationsPage(): UiPage {
  const tab = (id: string, label: string, children: UiNode[]) => ({ id, label, children });
  return {
    id: 'telegram-notifications',
    module: 'telegram',
    title: 'Сповіщення',
    icon: { symbol: 'bell.fill', tone: 'accent' },
    group: 'modules',
    children: [
      {
        id: 'events',
        type: 'section',
        title: 'Сповіщення',
        children: [
          {
            id: 'events-tabs',
            type: 'tabs',
            sticky: true,
            tabs: [
              tab('awake', 'Awake', [
                eventSwitch('awake', 'start', 'Початок сесії', { symbol: 'cup.and.saucer.fill', tone: 'accent' }),
                eventSwitch('awake', 'stop', 'Кінець сесії', { symbol: 'moon.fill', tone: 'accent' }),
                eventSwitch('ending', 'awake', 'Сесія Awake скоро скінчиться', { symbol: 'cup.and.saucer.fill', tone: 'orange' }),
                leadSelect('awake'),
              ]),
              tab('system', 'Стан Mac', [
                eventSwitch('system', 'power', 'Живлення увімкнено або вимкнено', { symbol: 'powerplug.fill', tone: 'accent' }),
                eventSwitch('system', 'batteryLow', 'Низький заряд', { symbol: 'battery.25', tone: 'accent' }),
                eventSwitch('system', 'thermal', 'Нагрівання', { symbol: 'thermometer.medium', tone: 'accent' }),
              ]),
              tab('sleep', 'Sleeper', [
                eventSwitch('sleep', 'start', 'Таймер поставлено', { symbol: 'moon.zzz.fill', tone: 'accent' }),
                eventSwitch('sleep', 'stop', 'Mac заснув або таймер скасовано', { symbol: 'moon.fill', tone: 'accent' }),
                eventSwitch('ending', 'sleep', 'Sleeper скоро спрацює', { symbol: 'moon.zzz.fill', tone: 'accent' }),
                leadSelect('sleep'),
              ]),
              tab('bot', 'Агент', [
                eventSwitch('bot', 'started', 'Агент запущено', { symbol: 'power', tone: 'accent' }),
                eventSwitch('bot', 'updated', 'Аппку оновлено', { symbol: 'arrow.up.circle', tone: 'accent' }),
                eventSwitch('bot', 'device', 'Новий пристрій підключено', { symbol: 'iphone.and.arrow.forward', tone: 'accent' }),
              ]),
              tab('tailscale', 'Tailscale', [
                eventSwitch('tailscale', 'status', 'Web UI через Tailscale працює або ні', {
                  symbol: 'point.3.connected.trianglepath.dotted',
                  tone: 'accent',
                }),
                eventSwitch('tailscale', 'pairing', 'Запит на сполучення через Tailscale', { symbol: 'qrcode', tone: 'accent' }),
                eventSwitch('tailscale', 'paired', 'Пристрій сполучено або відхилено', { symbol: 'checkmark.shield.fill', tone: 'accent' }),
                eventSwitch('tailscale', 'connected', 'Пристрій увійшов через Tailscale', { symbol: 'iphone', tone: 'accent' }),
              ]),
              tab('groups', 'Групи', [
                eventSwitch('groups', 'bound', 'Публікацію в групу дозволено', { symbol: 'link', tone: 'green' }),
                eventSwitch('groups', 'foreignLeft', 'Бот вийшов з групи: список переповнено', { symbol: 'hand.raised.fill', tone: 'orange' }),
                eventSwitch('groups', 'rightsLost', 'У бота забрали права в групі', { symbol: 'lock.fill', tone: 'orange' }),
                eventSwitch('groups', 'removed', 'Бота видалили з групи', { symbol: 'person.fill.xmark', tone: 'red' }),
                eventSwitch('groups', 'deliveryFailed', 'Сповіщення не дійшло в групу', { symbol: 'exclamationmark.triangle.fill', tone: 'red' }, false),
              ]),
            ],
          },
        ],
      },
    ],
  };
}

function telegramStatsPage(b: Buckets): UiPage {
  const counter = (id: string, title: string, tone: UiTone, base: number, seed: number): StatsChartSpec => ({
    id,
    title,
    tone,
    total: true,
    points: (period) => pts(b, period, base, seed),
  });
  return statsPage({
    id: 'telegram-stats',
    module: 'telegram',
    title: 'Статистика',
    icon: { symbol: 'chart.bar.fill', tone: 'accent' },
    footer: 'Журнал усіх джерел — Агент → Журнал.',
    sections: [
      {
        id: 'charts',
        title: 'Графіки',
        charts: [
          counter('src-telegram', 'Команд і кнопок', 'accent', 9, 1),
          counter('telegram-denied', 'Відхилено (команда вимкнена)', 'orange', 0.5, 2),
          counter('telegram-notify', 'Сповіщень надіслано', 'green', 3, 3),
          counter('telegram-notifyFailed', 'Сповіщень не доставлено', 'red', 0.2, 4),
        ],
      },
    ],
  });
}

// ---------- Групи (Telegram) ----------

const GROUP_ACTION = (name: string, params?: Record<string, string>): UiAction => ({
  module: 'groups',
  name,
  ...(params ? { params } : {}),
});

const UNBIND_CONFIRM: UiConfirm = {
  title: 'Вийти з групи?',
  text: 'Сповіщення підуть у приватний чат, повернути групу можна лише новим додаванням бота.',
  ok: 'Вийти',
};

/** Група з дозволом на публікацію: «MaControl: демо-група» (активна, одна), права бота і три топіки. */
function groupsPage(): UiPage {
  const groupTitle = 'MaControl: демо-група';
  const menu: UiMenuItem[] = [
    { id: 'groups-check-rights', label: 'Перевірити права', action: GROUP_ACTION('checkRights'), variant: 'default', disabled: false },
    { id: 'groups-ensure-topics', label: 'Створити топіки', action: GROUP_ACTION('ensureTopics'), variant: 'accent', disabled: false },
    { id: 'groups-release', label: 'Заборонити публікацію', action: GROUP_ACTION('release'), variant: 'default', disabled: false },
    {
      id: 'groups-unbind',
      label: 'Вийти з групи',
      action: GROUP_ACTION('unbind'),
      variant: 'danger',
      disabled: false,
      confirm: UNBIND_CONFIRM,
    },
  ];
  return {
    id: 'groups',
    module: 'groups',
    title: 'Групи',
    icon: { symbol: 'person.3.fill', tone: 'accent' },
    group: 'modules',
    scope: 'local',
    children: [
      {
        id: 'groups-binding',
        type: 'section',
        title: 'Куди публікувати',
        footer:
          'Додайте бота адміном у супергрупу з увімкненими темами: вона з\'явиться тут. Бот у групі нічого не робить, поки ви не дозволите публікацію; дозволена група одна. Усі групи за станом — на вкладці «Список груп». Те саме — командою /groups у приватному чаті з ботом.',
        children: [
          {
            id: 'groups-state',
            type: 'item',
            title: groupTitle,
            status: { label: 'Сповіщення йдуть у топіки групи', tone: 'green' },
            actions: menu,
          },
        ],
      },
      {
        id: 'groups-rights',
        type: 'section',
        title: 'Права бота',
        footer: 'Знімок з останньої події групи. «Перевірити права» читає його з провайдера заново.',
        children: [
          {
            id: 'groups-right-forum',
            type: 'item',
            title: 'Теми в групі',
            status: { label: '✓', tone: 'green' },
            comment: 'Окремий топік на кожне джерело сповіщень; без тем бот у групу не пише',
          },
          {
            id: 'groups-right-admin',
            type: 'item',
            title: 'Адміністратор',
            status: { label: '✓', tone: 'green' },
            comment: 'Без цього решти прав немає',
          },
          {
            id: 'groups-right-topics',
            type: 'item',
            title: 'Керування темами',
            status: { label: '✓', tone: 'green' },
            comment: 'Створювати топіки джерел і писати в закриті',
          },
          {
            id: 'groups-right-delete',
            type: 'item',
            title: 'Видалення повідомлень',
            status: { label: '✗', tone: 'gray' },
            comment: 'Знадобиться, щоб видаляти топіки; зараз бот топіків не видаляє',
          },
          {
            id: 'groups-right-pin',
            type: 'item',
            title: 'Закріплення повідомлень',
            status: { label: '✗', tone: 'gray' },
            comment: 'Не використовується. Конектор Telegram не підтримує: закріплення повідомлень',
          },
        ],
      },
      {
        id: 'groups-delivery',
        type: 'section',
        title: 'Доставка',
        footer:
          'Запасний приватний чат спрацьовує, коли відправка в групу не вдалась. Якщо групи немає зовсім, сповіщення йдуть у приватний чат завжди.',
        children: [
          {
            id: 'groups.delivery',
            type: 'select',
            module: 'groups',
            key: 'delivery',
            label: 'Куди слати сповіщення',
            hint: 'Поки публікацію не дозволено в жодну групу, сповіщення йдуть у приватний чат',
            icon: { symbol: 'arrow.triangle.branch', tone: 'accent' },
            scope: 'local',
            value: 'group',
            options: [
              { value: 'private', label: 'Приватний чат' },
              { value: 'group', label: 'Група' },
              { value: 'both', label: 'Приватний чат і група' },
            ],
          },
          {
            id: 'groups.fallbackPrivate',
            type: 'switch',
            module: 'groups',
            key: 'fallbackPrivate',
            label: 'Запасний приватний чат',
            hint: 'Сповіщення не дійшло в групу — надіслати його в приватний чат',
            icon: { symbol: 'arrow.uturn.backward', tone: 'accent' },
            scope: 'local',
            value: true,
          },
          {
            id: 'groups.commands',
            type: 'switch',
            module: 'groups',
            key: 'commands',
            label: 'Команди в групі',
            hint: 'Бот слухає команди й кнопки в групі з дозволом, лише від власника',
            icon: { symbol: 'command', tone: 'accent' },
            scope: 'local',
            value: true,
          },
        ],
      },
      {
        id: 'groups-capabilities',
        type: 'section',
        title: 'Конектор Telegram',
        footer: 'Ліміт провайдера: 20 повідомлень на хвилину в одну групу.',
        children: [
          {
            id: 'groups-capabilities-list',
            type: 'list',
            items: [
              { id: 'topics', label: 'Топіки на джерело', value: 'є' },
              { id: 'commands', label: 'Команди в групі', value: 'є' },
              { id: 'pins', label: 'Закріплення повідомлень', value: 'немає', hint: 'Конектор Telegram не підтримує: закріплення повідомлень' },
              { id: 'inviteLinks', label: 'Запрошення', value: 'немає', hint: 'Конектор Telegram не підтримує: запрошення' },
              { id: 'members', label: 'Учасники', value: 'немає', hint: 'Конектор Telegram не підтримує: учасники' },
              { id: 'joinRequests', label: 'Заявки на вступ', value: 'немає', hint: 'Конектор Telegram не підтримує: заявки на вступ' },
            ],
          },
        ],
      },
    ],
  };
}

/** «Список груп»: активна (одна), неактивна (бот є, дозвіл знято) і запити (порожньо). */
function groupsListPage(): UiPage {
  const addedBy = { active: '100000001', inactive: '100000002' };
  const caption = {
    active: 'Сюди бот публікує сповіщення. Зараз активною може бути одна група.',
    inactive: 'Бот у групі є, але нічого в ній не робить. «Активувати» перемикає публікацію сюди; попередня активна стає неактивною.',
    requests: 'Бота додали в групу, а ви ще не вирішили. До вашого рішення він нічого в ній не робить.',
  };
  return {
    id: 'groups-list',
    module: 'groups',
    title: 'Список груп',
    icon: { symbol: 'list.bullet', tone: 'accent' },
    group: 'modules',
    scope: 'local',
    children: [
      {
        id: 'groups-list',
        type: 'section',
        children: [
          {
            id: 'groups-list-tabs',
            type: 'tabs',
            sticky: true,
            tabs: [
              {
                id: 'active',
                label: 'Активні · 1',
                children: [
                  {
                    id: 'groups-list-active-1',
                    type: 'item',
                    title: 'MaControl: демо-група',
                    status: { label: 'Активна', tone: 'green' },
                    comment: `Додав ${addedBy.active}`,
                    actions: [
                      { id: 'groups-list-release', label: 'Деактивувати', action: GROUP_ACTION('release'), variant: 'default' },
                      {
                        id: 'groups-list-unbind',
                        label: 'Вийти з групи',
                        action: GROUP_ACTION('unbind'),
                        variant: 'danger',
                        confirm: UNBIND_CONFIRM,
                      },
                    ],
                  },
                  { id: 'groups-list-active-caption', type: 'text', text: caption.active },
                ],
              },
              {
                id: 'inactive',
                label: 'Неактивні · 1',
                children: [
                  {
                    id: 'groups-list-inactive-2',
                    type: 'item',
                    title: 'Сімейний чат',
                    status: { label: 'Неактивна', tone: 'gray' },
                    comment: `Додав ${addedBy.inactive}`,
                    actions: [
                      { id: 'groups-list-bind-2', label: 'Активувати', action: GROUP_ACTION('bind', { id: '2' }), variant: 'accent' },
                      { id: 'groups-list-leave-2', label: 'Вийти з групи', action: GROUP_ACTION('leave', { id: '2' }), variant: 'danger' },
                    ],
                  },
                  { id: 'groups-list-inactive-caption', type: 'text', text: caption.inactive },
                ],
              },
              {
                id: 'requests',
                label: 'Запити · 0',
                children: [
                  { id: 'groups-list-requests-empty', type: 'text', text: 'Запитів немає', tone: 'gray' },
                  { id: 'groups-list-requests-caption', type: 'text', text: caption.requests },
                ],
              },
            ],
          },
        ],
      },
    ],
  };
}

/** Топіки групи: по одному рядку на джерело сповіщень; три створені, три ще ні. */
function groupsTopicsPage(): UiPage {
  const control = (source: string): UiControl => ({
    type: 'switch',
    value: true,
    setting: { module: 'groups', key: `topic.${source}` },
  });
  const create = (source: string): UiMenuItem => ({
    id: `groups-topic-${source}-create`,
    label: 'Створити',
    action: GROUP_ACTION('recreateTopic', { source }),
    variant: 'accent',
    disabled: false,
  });
  return {
    id: 'groups-topics',
    module: 'groups',
    title: 'Топіки груп',
    icon: { symbol: 'text.bubble.fill', tone: 'accent' },
    group: 'modules',
    scope: 'local',
    children: [
      {
        id: 'groups-topics-state',
        type: 'section',
        title: 'MaControl: демо-група',
        status: { label: 'Топіки можна створювати', tone: 'green' },
        footer:
          'Джерело з вимкненим перемикачем пише в General групи, а Awake і Стан Mac — у приватний чат. Вимкнення не видаляє топік у групі.',
        children: [
          {
            id: 'groups-topic-awake',
            type: 'item',
            title: 'Awake',
            status: { label: 'Активний', tone: 'green' },
            comment: 'Топік «Awake»',
            control: control('awake'),
          },
          {
            id: 'groups-topic-system',
            type: 'item',
            title: 'Стан Mac',
            status: { label: 'Активний', tone: 'green' },
            comment: 'Топік «Стан Mac»',
            control: control('system'),
          },
          {
            id: 'groups-topic-sleep',
            type: 'item',
            title: 'Sleeper',
            status: { label: 'Активний', tone: 'green' },
            comment: 'Топік «Sleeper»',
            control: control('sleep'),
          },
          {
            id: 'groups-topic-ending',
            type: 'item',
            title: 'Попередження',
            status: { label: 'Не створено', tone: 'gray' },
            control: control('ending'),
            actions: [create('ending')],
          },
          {
            id: 'groups-topic-bot',
            type: 'item',
            title: 'Агент',
            status: { label: 'Не створено', tone: 'gray' },
            control: control('bot'),
            actions: [create('bot')],
          },
          {
            id: 'groups-topic-tailscale',
            type: 'item',
            title: 'Tailscale',
            status: { label: 'Не створено', tone: 'gray' },
            control: control('tailscale'),
            actions: [create('tailscale')],
          },
        ],
      },
    ],
  };
}

function groupsStatsPage(b: Buckets): UiPage {
  return statsPage({
    id: 'groups-stats',
    module: 'groups',
    title: 'Статистика',
    icon: { symbol: 'chart.bar.fill', tone: 'accent' },
    scope: 'all',
    footer: 'Лічильники доставки в групу з дозволом; сповіщення в приватний чат — Telegram → Статистика.',
    sections: [
      {
        id: 'charts',
        title: 'Графіки',
        charts: [
          {
            id: 'delivery',
            title: 'Сповіщення в групу',
            tones: { Надіслано: 'green', 'Не дійшло': 'red', 'Ліміт Telegram (429)': 'yellow', 'Випало з черги': 'orange' },
            total: true,
            points: (period) => [
              ...pts(b, period, 12, 21, 'Надіслано'),
              ...pts(b, period, 0.6, 22, 'Не дійшло'),
              ...pts(b, period, 0.8, 23, 'Ліміт Telegram (429)'),
              ...pts(b, period, 0.3, 24, 'Випало з черги'),
            ],
          },
          {
            id: 'lifecycle',
            title: 'Топіки і чужі групи',
            tones: { 'Топіки створено': 'accent', 'Вихід з чужої групи': 'indigo' },
            total: true,
            points: (period) => [...pts(b, period, 0.5, 25, 'Топіки створено'), ...pts(b, period, 0.2, 26, 'Вихід з чужої групи')],
          },
        ],
      },
    ],
  });
}

// ---------- Агент (bot) ----------

function botOverviewPage(): UiPage {
  const statusNode = (id: string, title: string, calls: number, status: { online: boolean; hint?: string }): UiNode => ({
    id,
    type: 'item',
    title,
    status: status.online ? { label: 'Працює', tone: 'green' } : { label: 'Не працює', tone: 'gray' },
    comment: [`Сьогодні ${calls}`, status.hint].filter(Boolean).join(' · '),
  });
  return {
    id: 'bot-overview',
    module: 'bot',
    title: 'Агент',
    icon: { symbol: 'gauge.with.dots.needle.67percent', tone: 'accent' },
    group: 'modules',
    children: [
      {
        id: 'agent',
        type: 'section',
        title: 'Агент',
        scope: 'mac',
        footer: 'Вимкнений агент не приймає дій і команд з Web UI і Telegram. Сервер, фонові задачі й ця аппка працюють далі.',
        children: [
          {
            id: 'bot.enabled',
            type: 'switch',
            module: 'bot',
            key: 'enabled',
            label: 'Агент',
            hint: 'Бізнес-логіка: дії й команди з Mac, Web UI і Telegram',
            icon: { symbol: 'cpu.fill', tone: 'accent' },
            scope: 'mac',
            value: true,
          },
        ],
      },
      {
        id: 'remote',
        type: 'section',
        title: 'Віддалений доступ',
        scope: 'mac',
        footer:
          'З якими шляхами до Web UI поза домашньою Wi-Fi працює агент; можна кілька. Сірий — його модуль вимкнено: увімкнути у вкладці Tailscale чи Webhooxy. Яким шляхом сполучити пристрій — у картці «Сполучити пристрій».',
        children: [
          {
            id: 'bot.remoteTailscale',
            type: 'switch',
            module: 'bot',
            key: 'remoteTailscale',
            label: 'Tailscale',
            hint: 'Web UI на https://<mac>.ts.net для пристроїв у твоєму tailnet',
            icon: { symbol: 'point.3.connected.trianglepath.dotted', tone: 'accent' },
            scope: 'mac',
            value: true,
          },
          {
            id: 'bot.remoteWebhooxy',
            type: 'switch',
            module: 'bot',
            key: 'remoteWebhooxy',
            label: 'Webhooxy',
            hint: "Канал зв'язку через relay webhooxy",
            icon: { symbol: 'arrow.triangle.branch', tone: 'accent' },
            scope: 'mac',
            value: false,
            disabled: true,
          },
        ],
      },
      {
        id: 'transports',
        type: 'section',
        title: 'Транспорти',
        footer: 'Вхідні точки в того самого бота: дії з усіх ідуть в один журнал. Проксі — інший шлях до транспорту.',
        children: [
          statusNode('transport-mac', 'Mac', 41, { online: true, hint: 'demo-mac' }),
          statusNode('transport-web', 'Веб', 23, { online: true, hint: 'https, порт 47800' }),
          statusNode('proxy-http:tailscale', '↳ http:tailscale (проксі)', 6, { online: true, hint: 'https://demo-mac.demo-tailnet.ts.net' }),
          statusNode('transport-telegram', 'Telegram', 18, { online: true, hint: 'Polling працює' }),
        ],
      },
    ],
  };
}

/** «Журнал»: останні виклики бота з усіх джерел (як botEventListItem: час · джерело · тип · помилка). */
function botJournalPage(): UiPage {
  const item = (id: number, minutesAgo: number, source: string, type: string, label: string, error: string | null = null) => ({
    id: String(id),
    label,
    hint: [sessionStart(inMinutes(-minutesAgo)), source, type, error].filter((part): part is string => !!part).join(' · '),
    value: error ? 'помилка' : 'ok',
  });
  return {
    id: 'bot-journal',
    module: 'bot',
    title: 'Журнал',
    icon: { symbol: 'list.bullet.rectangle.fill', tone: 'accent' },
    group: 'modules',
    children: [
      {
        id: 'events',
        type: 'section',
        title: 'Останні виклики',
        footer: 'Зберігаються останні 500. Відхилені Telegram-ом команди сюди не потрапляють — вони в статистиці Telegram.',
        children: [
          {
            id: 'list',
            type: 'list',
            items: [
              item(1187, 3, 'Telegram', 'дія', 'awake.start'),
              item(1186, 12, 'Веб через Tailscale', 'екран', 'media → меню'),
              item(1185, 25, 'Mac', 'налаштування', 'sleep.timer = 30'),
              item(1184, 41, 'Telegram', 'дія', 'sleep.stop', 'таймер не активний'),
              item(1183, 70, 'Mac', 'екран', 'system → меню'),
              item(1181, 180, 'Веб', 'дія', 'groups.checkRights'),
            ],
            empty: 'Бота ще ніхто не викликав',
          },
        ],
      },
    ],
  };
}

/** «Статистика» Агента: виклики разом і помилки, за джерелом, через проксі і за модулями (топ-6). */
function botStatsPage(b: Buckets): UiPage {
  const modules = ['awake', 'sleep', 'telegram', 'system', 'media', 'groups'];
  const moduleTones: Record<string, UiTone> = {
    awake: 'accent',
    sleep: 'green',
    telegram: 'indigo',
    system: 'yellow',
    media: 'orange',
    groups: 'gray',
  };
  return statsPage({
    id: 'bot-stats',
    module: 'bot',
    title: 'Статистика',
    icon: { symbol: 'chart.bar.fill', tone: 'accent' },
    footer:
      'Дії, екрани й налаштування з Mac, вебу (напряму й через проксі) і Telegram — усе, що йде через бота. Історія до stats-рушія є лише по днях.',
    sections: [
      {
        id: 'totals',
        title: 'Виклики',
        charts: [
          { id: 'total', title: 'Усього', tone: 'accent', total: 'Викликів', points: (period) => pts(b, period, 14, 5) },
          { id: 'errors', title: 'Помилок', tone: 'red', total: true, points: (period) => pts(b, period, 0.4, 6) },
        ],
      },
      {
        id: 'by-source',
        title: 'За джерелом',
        charts: [
          {
            id: 'sources',
            title: 'Джерела',
            tones: { Mac: 'accent', Веб: 'green', Telegram: 'indigo' },
            points: (period) => [...pts(b, period, 6, 7, 'Mac'), ...pts(b, period, 2, 8, 'Веб'), ...pts(b, period, 7, 9, 'Telegram')],
          },
        ],
      },
      {
        id: 'by-proxy',
        title: 'Через проксі',
        footer: 'Частина викликів джерела, що прийшла через проксі, а не напряму.',
        charts: [
          {
            id: 'proxies',
            title: 'Через проксі',
            tones: { 'Tailscale → Веб': 'accent' },
            points: (period) => pts(b, period, 1.5, 10, 'Tailscale → Веб'),
          },
        ],
      },
      {
        id: 'by-module',
        title: 'За модулями',
        footer: 'Найактивніші 6 модулів за період.',
        charts: [
          {
            id: 'modules',
            title: 'Модулі',
            tones: moduleTones,
            points: (period) => modules.flatMap((module, i) => pts(b, period, 4 - i * 0.4, 11 + i, module)),
          },
        ],
      },
    ],
  });
}

/** Сторінки в порядку меню: Telegram з дочірніми, Групи (провайдер Telegram) з дочірніми, Агент. */
export function telegramGroupsBotPages(): UiPage[] {
  const b = buckets();
  return [
    telegramPage(),
    telegramCommandsPage(),
    telegramNotificationsPage(),
    telegramStatsPage(b),
    groupsPage(),
    groupsListPage(),
    groupsTopicsPage(),
    groupsStatsPage(b),
    botOverviewPage(),
    botJournalPage(),
    botStatsPage(b),
  ];
}
