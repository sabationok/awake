import type { SessionRecord, SleepTimerRecord, UiChart, UiChartPoint, UiIcon, UiList, UiNode, UiOption, UiPage, UiRow, UiTone } from '@awake/contracts';
import { bucketsAgo, inMinutes } from '../time';

// Стан для фікстур: Awake-сесія йде (ще 80 хв, від батареї 78%, сон заблоковано), Sleeper без таймера,
// Keepers бачать Claude, Chrome і Spotify. Дзеркалить builder-и агента: `agent/src/modules/{awake,sleep,keepers}/pages`
// і спільний лейаут статистики `helpers/build-stats-page.ts`. Значення, що залежать від часу, йдуть через inMinutes() /
// bucketsAgo(); HH:MM і тривалості рахуються тими самими викликами, що в агенті.

/** HH:MM, як formatHhmm / formatClock в агенті (локальна зона браузера). */
function clock(iso: string): string {
  return new Date(iso).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });
}

const pad = (value: number) => String(value).padStart(2, '0');

/** Дата і час початку сесії, як formatSessionStart. */
function sessionStart(iso: string): string {
  return new Date(iso).toLocaleString('uk-UA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

/** «N год M хв» або «M хв», як formatDuration. */
function duration(ms: number): string {
  const minutes = Math.max(0, Math.floor(ms / 60_000));
  const hours = Math.floor(minutes / 60);
  return hours > 0 ? `${hours} год ${minutes % 60} хв` : `${minutes} хв`;
}

/** Тривалість між двома моментами, як formatElapsed. */
function elapsed(fromIso: string, toIso: string): string {
  return duration(new Date(toIso).getTime() - new Date(fromIso).getTime());
}

/** Запланована тривалість на таймері: «0:30:00», як formatSpan. */
function span(seconds: number): string {
  return `${Math.floor(seconds / 3600)}:${pad(Math.floor((seconds % 3600) / 60))}:00`;
}

/** Як сформувати «з 17:22» або «24.11 17:22» для утримання, як sinceLabel. */
function sinceLabel(iso: string): string {
  const date = new Date(iso);
  const time = `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  if (date.toDateString() === new Date().toDateString()) return time;
  return `${pad(date.getDate())}.${pad(date.getMonth() + 1)} ${time}`;
}

const SOURCE_LABEL: Record<SessionRecord['source'], string> = { mac: 'Mac', telegram: 'Telegram', web: 'Web UI' };

// Опції — з констант агента: DURATION_OPTIONS, SLEEP_TIMER_OPTIONS, UNTIL_OPTIONS (кожні пів години).
const DURATION_OPTIONS: UiOption[] = [
  { value: '30m', label: '30 хв' },
  { value: '1h', label: '1 год' },
  { value: '2h', label: '2 год' },
  { value: '4h', label: '4 год' },
  { value: '8h', label: '8 год' },
];

const SLEEP_TIMER_OPTIONS: UiOption[] = [
  { value: '15', label: '15 хв' },
  { value: '30', label: '30 хв' },
  { value: '45', label: '45 хв' },
  { value: '60', label: '1 год' },
  { value: '90', label: '1,5 год' },
  { value: '120', label: '2 год' },
];

const UNTIL_OPTIONS: UiOption[] = Array.from({ length: 48 }, (_, i) => {
  const value = `${pad(Math.floor(i / 2))}:${i % 2 ? '30' : '00'}`;
  return { value, label: value };
});

/** Перемикач налаштування Awake на сторінці сесії або налаштуваннях сесії. */
function awakeSwitch(key: string, label: string, value: boolean, icon: UiIcon, hint?: string): UiNode {
  return {
    id: `awake.${key}`,
    type: 'switch',
    module: 'awake',
    key,
    label,
    ...(hint ? { hint } : {}),
    icon,
    value,
  };
}

// ───────────────────────── Awake: «Сесія» ─────────────────────────

function awakeSessionPage(): UiPage {
  const until = inMinutes(80);
  const from = inMinutes(-40);
  return {
    id: 'session',
    module: 'awake',
    title: 'Сесія',
    icon: { symbol: 'cup.and.saucer.fill', tone: 'orange' },
    group: 'modules',
    children: [
      {
        id: 'session',
        type: 'section',
        footer:
          'Mac не засинає навіть із закритою кришкою. Сон повертається сам після таймера, при низькому заряді або перегріві, і коли ти виходиш з аппки.',
        children: [
          // sessionTimerNode: сесія йде — відлік до mac.until, підпис «Не спить до HH:MM».
          { id: 'timer', type: 'timer', until, from, value: 'Не спить', caption: `Не спить до ${clock(until)}`, tone: 'orange' },
          // planTabsNode: mode = period → активна вкладка «Період» (duration = 2h, як у mac.duration).
          {
            id: 'plan',
            type: 'tabs',
            value: 'period',
            setting: { module: 'awake', key: 'mode' },
            tabs: [
              {
                id: 'period',
                label: 'Період',
                children: [
                  {
                    id: 'plan-duration',
                    type: 'row',
                    label: 'Тривалість',
                    control: { type: 'select', value: '2h', options: DURATION_OPTIONS, setting: { module: 'awake', key: 'duration' } },
                  },
                ],
              },
              {
                id: 'time',
                label: 'Час',
                children: [
                  {
                    id: 'plan-until',
                    type: 'row',
                    label: 'Не спати до',
                    control: { type: 'select', value: '08:00', options: UNTIL_OPTIONS, setting: { module: 'awake', key: 'until' } },
                  },
                ],
              },
            ],
          },
          awakeSwitch('startDisplayOff', 'Погасити екран', false, { symbol: 'display', tone: 'accent' }),
          awakeSwitch('startLock', 'Заблокувати', false, { symbol: 'lock.fill', tone: 'accent' }, 'Лише для цієї сесії: після неї вимикається'),
          // sessionButtons: сесія йде, вибрано той самий час → лише «Стоп».
          {
            id: 'session-buttons',
            type: 'buttons',
            buttons: [{ id: 'stop', label: 'Стоп', variant: 'destructive', action: { module: 'awake', name: 'stop' } }],
          },
          // sessionNowButtons: обидва перемикачі вимкнено — дії «зараз» під «Стоп».
          {
            id: 'session-now',
            type: 'buttons',
            buttons: [
              { id: 'session-display-off-now', label: 'Погасити зараз', variant: 'plain', action: { module: 'awake', name: 'displayOff' } },
              { id: 'session-lock-now', label: 'Заблокувати зараз', variant: 'plain', action: { module: 'awake', name: 'lock' } },
            ],
          },
        ],
      },
      {
        id: 'screen',
        type: 'section',
        children: [
          {
            id: 'display-off-now',
            type: 'row',
            label: 'Погасити екран зараз',
            control: {
              type: 'button',
              button: { id: 'display-off', label: 'Погасити', variant: 'plain', disabled: false, action: { module: 'awake', name: 'displayOff' } },
            },
          },
        ],
      },
      {
        id: 'state',
        type: 'section',
        title: 'Стан',
        children: [
          { id: 'sleep', type: 'row', label: 'Сон', value: 'Заблоковано', icon: { symbol: 'moon.fill', tone: 'indigo' } },
          { id: 'battery', type: 'row', label: 'Батарея', value: '78% · від батареї', icon: { symbol: 'battery.75', tone: 'green' } },
          { id: 'thermal', type: 'row', label: 'Температура', value: 'Норма', icon: { symbol: 'thermometer.medium', tone: 'green' } },
        ],
      },
    ],
  };
}

// ───────────────────────── Awake: «Налаштування сесії» ─────────────────────────

function awakeSessionSettingsPage(): UiPage {
  return {
    id: 'session-settings',
    module: 'awake',
    title: 'Налаштування сесії',
    icon: { symbol: 'slider.horizontal.3', tone: 'accent' },
    group: 'modules',
    children: [
      {
        id: 'screen',
        type: 'section',
        title: 'Екран',
        footer:
          'Із закритою кришкою вбудований екран гасне одразу. «Гасити екран» діє, коли кришка відкрита або підключено зовнішній монітор. «Як у системі» означає налаштування з розділу «Замкнений екран».',
        children: [
          {
            id: 'awake.displayOff',
            type: 'select',
            module: 'awake',
            key: 'displayOff',
            label: 'Гасити екран під час сесії',
            icon: { symbol: 'display', tone: 'accent' },
            value: '-1',
            options: [
              { value: '-1', label: 'Як у системі' },
              { value: '5', label: 'Одразу' },
              { value: '30', label: 'Через 30 с' },
              { value: '60', label: 'Через 1 хв' },
              { value: '120', label: 'Через 2 хв' },
            ],
          },
          awakeSwitch(
            'lockOnLidClose',
            'Блокувати екран при закритті кришки',
            true,
            { symbol: 'lock.laptopcomputer', tone: 'accent' },
            'Під час сесії Mac не засинає, тому сам не вимагатиме пароль',
          ),
        ],
      },
      {
        id: 'restore-sleep',
        type: 'section',
        title: 'Повернути сон',
        children: [
          {
            id: 'awake.batteryStop',
            type: 'select',
            module: 'awake',
            key: 'batteryStop',
            label: 'Повернути сон при заряді',
            icon: { symbol: 'battery.0', tone: 'red' },
            value: '10',
            options: [
              { value: '5', label: '5%' },
              { value: '10', label: '10%' },
              { value: '15', label: '15%' },
              { value: '20', label: '20%' },
            ],
          },
          {
            id: 'thermal-stop',
            type: 'row',
            label: 'Повернути сон при перегріві',
            value: 'Критичний',
            icon: { symbol: 'flame.fill', tone: 'orange' },
          },
        ],
      },
    ],
  };
}

// ───────────────────────── Статистика: спільний лейаут «Трекінг» ─────────────────────────

type StatsPeriod = 'today' | 'days' | 'weeks' | 'months';

/** Вкладки періоду в порядку показу (STATS_PAGE_PERIODS). */
const PERIODS: { value: StatsPeriod; label: string }[] = [
  { value: 'today', label: 'Сьогодні' },
  { value: 'days', label: 'Дні' },
  { value: 'weeks', label: 'Тижні' },
  { value: 'months', label: 'Місяці' },
];

/** Кількість бакетів у вікні вкладки: години доби, 30 днів, 12 тижнів, 12 місяців (statsPeriodWindow). */
const BUCKETS: Record<StatsPeriod, number> = { today: 24, days: 30, weeks: 12, months: 12 };
const UNIT: Record<StatsPeriod, UiChart['unit']> = { today: 'hour', days: 'day', weeks: 'week', months: 'month' };

/**
 * Початки бакетів вікна. Години — від поточної години назад; дні — від сьогодні назад. Тижні й місяці — наближено
 * кроком у 7 і 30 днів, бо inMinutes / bucketsAgo не знають тижнів і місяців.
 */
function bucketStarts(period: StatsPeriod): string[] {
  const n = BUCKETS[period];
  return Array.from({ length: n }, (_, i) => {
    const back = n - 1 - i;
    if (period === 'today') return bucketsAgo(back, 'hour');
    if (period === 'days') return bucketsAgo(back, 'day');
    return bucketsAgo(back * (period === 'weeks' ? 7 : 30), 'day');
  });
}

/** Детерміновані числа 0…mod-1 для стовпчиків: фікстура не стрибає між перезавантаженнями. */
function sequence(period: StatsPeriod, mul: number, add: number, mod: number): number[] {
  return Array.from({ length: BUCKETS[period] }, (_, i) => (i * mul + add) % mod);
}

interface TrackingChart {
  id: string;
  title: string;
  tone?: UiTone;
  tones?: Record<string, UiTone>;
  format: NonNullable<UiChart['format']>;
  /** Сума за період у «Підсумку»: true — під назвою графіка, рядок — під цим підписом. */
  total: boolean | string;
  points(period: StatsPeriod): UiChartPoint[];
}

interface TrackingSpec {
  id: string;
  module: string;
  title: string;
  icon: UiIcon;
  footer: string;
  charts: TrackingChart[];
  /** Додаткові рядки «Підсумку»; id локальний, період додається сам. */
  summary(totals: Record<string, number>, period: StatsPeriod): UiRow[];
}

/** Сторінка «Трекінг» у лейауті buildStatsPage: прилиплі вкладки періоду, у кожній — «Підсумок» і «Графіки». */
function trackingPage(spec: TrackingSpec): UiPage {
  const tab = (period: StatsPeriod): UiNode[] => {
    const totals: Record<string, number> = {};
    const totalRows: UiRow[] = [];
    const charts: UiChart[] = spec.charts.map((chart): UiChart => {
      const points = chart.points(period);
      const sum = points.reduce((acc, point) => acc + point.value, 0);
      totals[chart.id] = sum;
      if (chart.total) {
        totalRows.push({
          id: `${spec.id}-total-${chart.id}-${period}`,
          type: 'row',
          label: typeof chart.total === 'string' ? chart.total : chart.title,
          value: chart.format === 'duration' ? duration(sum * 1000) : String(sum),
        });
      }
      return {
        id: `${spec.id}-${chart.id}-${period}`,
        type: 'chart',
        title: chart.title,
        unit: UNIT[period],
        format: chart.format,
        points,
        ...(chart.tone ? { tone: chart.tone } : {}),
        ...(chart.tones ? { tones: chart.tones } : {}),
      };
    });
    const extra = spec.summary(totals, period).map((row) => ({ ...row, id: `${spec.id}-${row.id}-${period}` }));
    const rows = [...totalRows, ...extra];
    const summary: UiNode[] = rows.length
      ? [{ id: `${spec.id}-summary-${period}`, type: 'section', title: 'Підсумок', footer: spec.footer, children: rows }]
      : [];
    return [...summary, { id: `${spec.id}-charts-${period}`, type: 'section', title: 'Графіки', children: charts }];
  };

  return {
    id: spec.id,
    module: spec.module,
    title: spec.title,
    icon: spec.icon,
    group: 'modules',
    children: [
      {
        id: `${spec.id}-period`,
        type: 'tabs',
        sticky: true,
        value: 'today',
        setting: { module: spec.module, key: 'statsPeriod' },
        tabs: PERIODS.map(({ value, label }) => ({ id: value, label, children: tab(value) })),
      },
    ],
  };
}

// ───────────────────────── Awake: «Трекінг» ─────────────────────────

function awakeTrackingPage(): UiPage {
  // Лічильники і секунди без сну: одна сесія ≈ 40–90 хв, тож секунди — з кроком у ~40 хв на сесію.
  const counts = (period: StatsPeriod) => sequence(period, 7, 3, 5);
  const points = (period: StatsPeriod, values: number[]): UiChartPoint[] =>
    bucketStarts(period).map((start, i) => ({ start, value: values[i] }));
  return trackingPage({
    id: 'tracking',
    module: 'awake',
    title: 'Трекінг',
    icon: { symbol: 'chart.bar.xaxis', tone: 'accent' },
    footer: 'Час — лише закритих сесій, розкладений по годинах, у які Mac справді не спав. Дні, тижні й місяці — за UTC.',
    charts: [
      { id: 'count', title: 'Сесій', tone: 'accent', format: 'count', total: true, points: (period) => points(period, counts(period)) },
      {
        id: 'time',
        title: 'Час',
        tone: 'green',
        format: 'duration',
        total: 'Разом',
        points: (period) => points(period, counts(period).map((c, i) => (c ? c * 2400 + (i % 3) * 600 : 0))),
      },
    ],
    summary: (totals) => [
      {
        id: 'average',
        type: 'row',
        label: 'У середньому',
        value: totals.count > 0 ? duration((totals.time / totals.count) * 1000) : '—',
      },
    ],
  });
}

// ───────────────────────── Awake: «Історія сесій» ─────────────────────────

const AWAKE_SESSIONS: SessionRecord[] = [
  { id: 6, startedAt: inMinutes(-40), endedAt: null, duration: '2h', source: 'mac', endReason: null, batteryStart: 78, batteryEnd: null },
  { id: 5, startedAt: inMinutes(-1100), endedAt: inMinutes(-1000), duration: '2h', source: 'telegram', endReason: 'таймер завершився', batteryStart: 64, batteryEnd: 41 },
  { id: 4, startedAt: inMinutes(-1500), endedAt: inMinutes(-1380), duration: '1h', source: 'web', endReason: 'зупинено вручну', batteryStart: 88, batteryEnd: 70 },
  { id: 3, startedAt: inMinutes(-2900), endedAt: inMinutes(-2880), duration: '30m', source: 'mac', endReason: 'Sleeper', batteryStart: 92, batteryEnd: 90 },
  { id: 2, startedAt: inMinutes(-4400), endedAt: inMinutes(-4150), duration: '4h', source: 'mac', endReason: 'зупинено вручну', batteryStart: 55, batteryEnd: 33 },
  { id: 1, startedAt: inMinutes(-7300), endedAt: inMinutes(-7000), duration: '8h', source: 'mac', endReason: 'перезапуск', batteryStart: 100, batteryEnd: 62 },
];

function awakeHistoryPage(): UiPage {
  const now = new Date();
  const items: UiList['items'] = AWAKE_SESSIONS.map((session) => {
    const parts = [SOURCE_LABEL[session.source], session.duration, session.endReason ?? (session.endedAt ? null : 'триває')];
    return {
      id: String(session.id),
      label: sessionStart(session.startedAt),
      hint: parts.filter((part): part is string => part !== null).join(' · '),
      value: elapsed(session.startedAt, session.endedAt ?? now.toISOString()),
    };
  });
  return {
    id: 'awake-history',
    module: 'awake',
    title: 'Історія сесій',
    icon: { symbol: 'clock.arrow.circlepath', tone: 'accent' },
    group: 'modules',
    children: [
      {
        id: 'history',
        type: 'section',
        title: 'Останні 30',
        children: [{ id: 'sessions', type: 'list', items, empty: 'Ще не було жодної сесії' }],
      },
    ],
  };
}

// ───────────────────────── Awake: «Журнал» (системна) ─────────────────────────

function awakeLogPage(): UiPage {
  const now = new Date();
  const records: { id: number; at: string; text: string }[] = [
    { id: 6, at: inMinutes(-40), text: 'Awake: сесію запущено на 2 год' },
    { id: 5, at: inMinutes(-38), text: 'Екран погашено при старті сесії' },
    { id: 4, at: inMinutes(-95), text: 'Awake: сесію зупинено вручну' },
    { id: 3, at: inMinutes(-130), text: 'Sleeper: таймер сну на 30 хв' },
    { id: 2, at: inMinutes(-1500), text: 'Сон повернуто: заряд 10%' },
    { id: 1, at: inMinutes(-1620), text: 'Telegram: сесію Awake завершено' },
  ];
  const items: UiList['items'] = records.map((log) => {
    const date = new Date(log.at);
    const isToday = date.toDateString() === now.toDateString();
    return {
      id: String(log.id),
      label: log.text,
      value: clock(log.at),
      ...(isToday ? {} : { hint: date.toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' }) }),
    };
  });
  return {
    id: 'log',
    module: 'awake',
    title: 'Журнал',
    icon: { symbol: 'list.bullet.rectangle', tone: 'gray' },
    group: 'system',
    children: [
      {
        id: 'entries',
        type: 'section',
        children: [{ id: 'logs', type: 'list', items, empty: 'Записів ще немає' }],
      },
    ],
  };
}

// ───────────────────────── Sleeper: таймер сну (без активного таймера) ─────────────────────────

function sleepTimerPage(): UiPage {
  // Awake іде, тож таймер сну показує «Іде сесія Awake»: старт таймера її завершить.
  const end = inMinutes(30);
  return {
    id: 'sleep-timer',
    module: 'sleep',
    title: 'Sleeper',
    icon: { symbol: 'moon.zzz.fill', tone: 'indigo' },
    group: 'modules',
    children: [
      {
        id: 'timer',
        type: 'section',
        footer:
          'Mac засне в зазначений час, навіть якщо грає відео. Таймер і сесія Awake не працюють разом: нова сесія завершує попередню.',
        children: [
          { id: 'countdown', type: 'timer', value: span(30 * 60), caption: `Старт — засне о ${clock(end)}`, tone: 'gray' },
          {
            id: 'plan',
            type: 'tabs',
            value: 'period',
            setting: { module: 'sleep', key: 'mode' },
            tabs: [
              {
                id: 'period',
                label: 'Період',
                children: [
                  {
                    id: 'plan-minutes',
                    type: 'row',
                    label: 'Тривалість',
                    control: { type: 'select', value: '30', options: SLEEP_TIMER_OPTIONS, setting: { module: 'sleep', key: 'minutes' } },
                  },
                ],
              },
              {
                id: 'time',
                label: 'Час',
                children: [
                  {
                    id: 'plan-until',
                    type: 'row',
                    label: 'Заснути о',
                    control: { type: 'select', value: '01:00', options: UNTIL_OPTIONS, setting: { module: 'sleep', key: 'until' } },
                  },
                ],
              },
            ],
          },
          {
            id: 'awake-running',
            type: 'row',
            label: 'Іде сесія Awake',
            hint: 'Старт таймера її завершить',
            icon: { symbol: 'cup.and.saucer.fill', tone: 'orange' },
          },
          {
            id: 'timer-buttons',
            type: 'buttons',
            buttons: [{ id: 'start', label: 'Старт', variant: 'filled', disabled: false, action: { module: 'sleep', name: 'start' } }],
          },
        ],
      },
    ],
  };
}

// ───────────────────────── Sleeper: «Трекінг» ─────────────────────────

const SLEEP_SERIES = { slept: 'Заснув', cancelled: 'Скасовано', running: 'Триває' } as const;

/** Таймери по бакетах за наслідком: Заснув / Скасовано / Триває (sleepTimerPoints). Активного таймера немає. */
function sleepPoints(period: StatsPeriod): UiChartPoint[] {
  const slept = sequence(period, 5, 1, 3);
  const cancelled = sequence(period, 3, 2, 2);
  return bucketStarts(period).flatMap((start, i) => [
    { start, series: SLEEP_SERIES.slept, value: slept[i] },
    { start, series: SLEEP_SERIES.cancelled, value: cancelled[i] },
    { start, series: SLEEP_SERIES.running, value: 0 },
  ]);
}

function sleepTrackingPage(): UiPage {
  const seriesSum = (period: StatsPeriod, series: string) =>
    sleepPoints(period)
      .filter((point) => point.series === series)
      .reduce((acc, point) => acc + point.value, 0);
  return trackingPage({
    id: 'sleep-tracking',
    module: 'sleep',
    title: 'Трекінг',
    icon: { symbol: 'chart.bar.xaxis', tone: 'indigo' },
    footer: 'Рахується з історії таймерів. Дні, тижні й місяці — за UTC.',
    charts: [
      {
        id: 'timers',
        title: 'Таймерів',
        tones: { [SLEEP_SERIES.slept]: 'indigo', [SLEEP_SERIES.cancelled]: 'gray', [SLEEP_SERIES.running]: 'green' },
        format: 'count',
        total: true,
        points: sleepPoints,
      },
    ],
    summary: (_totals, period) => [
      { id: 'slept', type: 'row', label: 'Mac заснув', value: String(seriesSum(period, SLEEP_SERIES.slept)) },
      { id: 'cancelled', type: 'row', label: 'Скасовано', value: String(seriesSum(period, SLEEP_SERIES.cancelled)) },
    ],
  });
}

// ───────────────────────── Sleeper: «Історія таймерів» ─────────────────────────

const SLEEP_TIMERS: SleepTimerRecord[] = [
  { id: 6, startedAt: inMinutes(-2000), sleepAt: inMinutes(-1970), minutes: 30, endedAt: inMinutes(-1970), source: 'mac', endReason: 'Mac заснув' },
  { id: 5, startedAt: inMinutes(-3600), sleepAt: inMinutes(-3540), minutes: 60, endedAt: inMinutes(-3650), source: 'web', endReason: 'скасовано' },
  { id: 4, startedAt: inMinutes(-5000), sleepAt: inMinutes(-3500), minutes: 90, endedAt: inMinutes(-4800), source: 'telegram', endReason: 'сесія Awake' },
  { id: 3, startedAt: inMinutes(-8000), sleepAt: inMinutes(-7100), minutes: 15, endedAt: inMinutes(-7100), source: 'telegram', endReason: 'Mac заснув' },
  { id: 2, startedAt: inMinutes(-9000), sleepAt: inMinutes(-1800), minutes: 120, endedAt: inMinutes(-1800), source: 'mac', endReason: 'Mac заснув' },
  { id: 1, startedAt: inMinutes(-11000), sleepAt: inMinutes(-10300), minutes: 45, endedAt: inMinutes(-10400), source: 'mac', endReason: 'скасовано' },
];

function sleepHistoryPage(): UiPage {
  const items: UiList['items'] = SLEEP_TIMERS.map((timer) => {
    const end = timer.endReason ?? (timer.endedAt ? null : `засне о ${clock(timer.sleepAt)}`);
    return {
      id: String(timer.id),
      label: sessionStart(timer.startedAt),
      hint: [SOURCE_LABEL[timer.source], end].filter((part): part is string => part !== null).join(' · '),
      value: `${timer.minutes} хв`,
    };
  });
  return {
    id: 'sleep-history',
    module: 'sleep',
    title: 'Історія таймерів',
    icon: { symbol: 'clock.arrow.circlepath', tone: 'accent' },
    group: 'modules',
    children: [
      {
        id: 'history',
        type: 'section',
        title: 'Останні 30',
        children: [{ id: 'timers', type: 'list', items, empty: 'Ще не було жодного таймера' }],
      },
    ],
  };
}

// ───────────────────────── Keepers: «Keepers» ─────────────────────────

interface KeeperFixture {
  id: string;
  pid: number;
  process: string;
  kind: 'system' | 'display';
  reason: string;
  since: string;
}

const KEEPERS: KeeperFixture[] = [
  { id: 'claude-task', pid: 4821, process: 'Claude', kind: 'system', reason: 'виконує завдання', since: inMinutes(-25) },
  { id: 'chrome-video', pid: 612, process: 'Google Chrome', kind: 'display', reason: 'відтворення відео', since: inMinutes(-10) },
  { id: 'spotify-audio', pid: 1388, process: 'Spotify', kind: 'system', reason: 'відтворення музики', since: inMinutes(-55) },
];

const KIND_LABEL: Record<KeeperFixture['kind'], string> = { system: 'система', display: 'екран' };

function keepersPage(): UiPage {
  // Awake тримає Mac (mac.active), Sleeper не заплановано; сторонні процеси — з pmset.
  const names = ['Awake', ...KEEPERS.map((keeper) => keeper.process)];
  const until = inMinutes(80);
  return {
    id: 'keepers',
    module: 'keepers',
    title: 'Keepers',
    icon: { symbol: 'hand.raised.fill', tone: 'orange' },
    group: 'modules',
    children: [
      {
        id: 'keepers-state',
        type: 'section',
        children: [
          {
            id: 'keepers-status',
            type: 'item',
            title: 'Сон Mac',
            icon: { symbol: 'moon.zzz', tone: 'indigo' },
            status: { label: 'Не засне сам', tone: 'green' },
            comment: `Тримають: ${names.join(', ')}`,
          },
        ],
      },
      {
        id: 'keepers-sessions',
        type: 'section',
        title: 'Сесії MaControl',
        children: [
          {
            id: 'keepers-awake',
            type: 'item',
            title: 'Awake',
            status: { label: `до ${clock(until)}`, tone: 'green' },
            comment: 'Тримає Mac без сну',
          },
          {
            id: 'keepers-sleeper',
            type: 'item',
            title: 'Sleeper',
            status: { label: 'немає', tone: 'gray' },
            comment: 'Не тримає, а присипляє: спрацює попри всіх у цьому списку',
          },
        ],
      },
      {
        id: 'keepers-others',
        type: 'section',
        title: `Інші процеси · ${KEEPERS.length}`,
        footer:
          'Програми, які самі попросили macOS не засинати: Claude під час роботи, браузер з відео, плеєр. Вони лише показуються, таймера їм поставити не можна. Sleeper присипляє Mac попри них.',
        children: [
          {
            id: 'keepers-list',
            type: 'list',
            empty: 'Ніхто не тримає',
            items: KEEPERS.map((keeper) => ({
              id: keeper.id,
              label: keeper.process,
              value: KIND_LABEL[keeper.kind],
              hint: `з ${sinceLabel(keeper.since)} · ${keeper.reason} · pid ${keeper.pid}`,
            })),
          },
        ],
      },
    ],
  };
}

/** Сторінки Awake, Sleeper і Keepers у порядку, який віддають pages() модулів (AwakeMacModule, SleepMacModule, KeepersMacModule). */
export function awakeSleepKeepersPages(): UiPage[] {
  return [
    awakeSessionPage(),
    awakeSessionSettingsPage(),
    awakeTrackingPage(),
    awakeHistoryPage(),
    awakeLogPage(),
    sleepTimerPage(),
    sleepTrackingPage(),
    sleepHistoryPage(),
    keepersPage(),
  ];
}
