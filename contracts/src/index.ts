// Спільні типи агента, Mac-аппки і Web UI. Лише типи і константи без залежностей.
export * from './ui';
export * from './modules';
export * from './relay';
export * from './webhooks';
export * from './stats';

export type PowerSource = 'AC' | 'BAT' | 'unknown';
export type ThermalLevel = 'nominal' | 'fair' | 'serious' | 'critical';
/** Звідки прийшла дія над сесією. */
export type SessionSource = 'mac' | 'telegram' | 'web';
export type SessionEventType = 'start' | 'restart' | 'stop';
export type CommandAction = 'start' | 'stop' | 'lock' | 'displayOff' | 'setting' | 'sleepTimer' | 'volume' | 'mute' | 'brightness';

/** Знімок стану Mac, який Mac-аппка шле агенту. */
export interface MacState {
  host: string;
  active: boolean;
  /** ISO, кінець сесії. */
  until: string | null;
  startedAt: string | null;
  duration: string | null;
  battery: number | null;
  power: PowerSource;
  thermal: ThermalLevel;
  lidClosed: boolean;
  sleepBlocked: boolean;
  /** Поточна мережа Wi-Fi, null без дозволу геолокації або без Wi-Fi. */
  ssid: string | null;
  appVersion: string;
  /** ISO, коли поставили таймер сну; null — таймера немає. */
  sleepStartedAt: string | null;
  /** ISO, коли таймер сну присипить Mac; null — таймера немає. */
  sleepAt: string | null;
  /** Гучність виходу 0…100; null — пристрій не дає її змінювати. */
  volume: number | null;
  muted: boolean;
  /** Яскравість вбудованого дисплея 0…100; null — його немає (кришка закрита, лише зовнішній монітор). */
  brightness: number | null;
}


export interface SessionRecord {
  id: number;
  startedAt: string;
  endedAt: string | null;
  duration: string | null;
  source: SessionSource;
  endReason: string | null;
  batteryStart: number | null;
  batteryEnd: number | null;
}

/** Сесія таймера сну: поставили → Mac заснув, скасували або замінили сесією Awake. */
export interface SleepTimerRecord {
  id: number;
  startedAt: string;
  sleepAt: string;
  minutes: number;
  endedAt: string | null;
  source: SessionSource;
  endReason: string | null;
}

/** Подія таймера сну від Mac-аппки. `silent` — записати в історію, але не слати в Telegram (перезапуск). */
export interface SleepTimerEvent {
  event: 'start' | 'stop';
  at: string;
  startedAt: string;
  sleepAt: string;
  minutes: number;
  source: SessionSource;
  reason?: string | null;
  silent: boolean;
}

export interface LogRecord {
  id: number;
  at: string;
  text: string;
}

export interface CommandRequest {
  action: CommandAction;
  /** Для start: 30m, 1h, 2h… Без нього Mac бере тривалість за замовчуванням. */
  duration?: string;
  /**
   * Для setting: ключ `<module>.<key>` і нове значення, яке Mac має застосувати в себе.
   * Для sleepTimer — хвилини до сну (0 скасовує), volume / brightness — 0…100, mute — boolean.
   */
  key?: string;
  value?: string | number | boolean;
}

/**
 * Наступний крок для клієнта: дія, а не сторінка. Яку сторінку відкрити, вирішує клієнт (мапа кроків у вебі).
 * `auth/login` — потрібен вхід паролем; `pair/scan` — пристрій не сполучений, треба відсканувати QR на Mac.
 */
export type AppNextStep = { type: 'auth'; action: 'login' } | { type: 'pair'; action: 'scan' };

/** Відповідь API агента. */
export interface AppResponse<T> {
  ok: boolean;
  data?: T;
  error?: { code: string; message: string };
  next?: AppNextStep;
}

/** Таймаути бездіяльності вебсесії, хвилини (вибирається при вході). */
export const WEB_SESSION_IDLE_OPTIONS = [2, 5, 10] as const;
export type WebSessionIdleMinutes = (typeof WEB_SESSION_IDLE_OPTIONS)[number];

/** Кука вебсесії: HttpOnly, opaque-токен; сесію веде агент у SQLite. */
export const WEB_SESSION_COOKIE = 'mc_session';

/** `GET /api/auth/session`. Для agent / device (Bearer) сесії немає: обидва поля null. */
export interface WebSessionInfo {
  idleMinutes: WebSessionIdleMinutes | null;
  expiresAt: string | null;
}

/** `POST /api/auth/login`. */
export interface WebLoginBody {
  password: string;
  idleMinutes: WebSessionIdleMinutes;
}

/** Рядки протоколу Mac-аппка ↔ агент (JSON lines через stdin/stdout). */
export type MacToAgentMessage =
  | { type: 'state'; data: MacState }
  | { type: 'log'; data: { at: string; text: string } }
  | {
      type: 'session';
      data: {
        event: SessionEventType;
        at: string;
        source: SessionSource;
        duration?: string;
        battery?: number | null;
        reason?: string;
      };
    }
  | { type: 'sleepTimer'; data: SleepTimerEvent }
  /** Натискання в SwiftUI-рендерері: агент виконує його так само, як з вебу. */
  | { type: 'event'; data: import('./ui').UiEvent }
  /** Сторінка «Пристрої» в Mac-аппці: попросити свіжий знімок або відкликати пристрій. */
  | {
      type: 'devices';
      data:
        | { action: 'refresh' }
        | { action: 'revoke'; id: number }
        /** Відповідь на «Це ви?» для пристрою, що відкрив посилання з QR. */
        | { action: 'answer'; requestId: string; approve: boolean }
        /** «Новий код»: старі коди перестають діяти, обидва посилання (локальне й дистанційне) отримують нові. */
        | { action: 'newCode' };
    }
  /** Аппка переписала ~/.config/awake/relay.env: агент перечитує ключі й перепідключає webhooxy. Значень тут немає. */
  | { type: 'relayEnv'; data: { action: 'reload' } }
  /** Аппка переписала ~/.config/awake/envify.env або просить оновити: агент заново тягне змінні з Envify. */
  | { type: 'envify'; data: { action: 'reload' } }
  /** Довірені мережі Wi-Fi: список у SQLite агента, аппка лише додає й прибирає. */
  | { type: 'trustedNetworks'; data: { action: 'add' | 'remove'; ssid: string } }
  /** Bluetooth-пристрої поруч, раз на кілька секунд, поки ввімкнено `proximity.enabled`. Рішення блокувати — за агентом. */
  | { type: 'proximity'; data: ProximityReport }
  /** Вебхуки webhooxy: аппка зберігає форму з модалки, вмикає, вимикає, прибирає. Секрети сюди не йдуть. */
  | { type: 'webhooks'; data: import('./webhooks').WebhookAction }
  /** Сторінка «Сервер» відкрилась або змінився період: агент шле графіки й далі live-тіки цього періоду. */
  | { type: 'serverCharts'; data: { period: StatsPeriod } };

/** Стан Bluetooth на Mac. `unauthorized` — macOS не дала аппці доступ. */
export type BluetoothState = 'on' | 'off' | 'unauthorized' | 'unsupported' | 'unknown';

/** Пристрій, який Mac бачив за останні секунди. `id` — ідентифікатор CoreBluetooth, стабільний для цього Mac. */
export interface NearbyDevice {
  id: string;
  name: string;
  /** Згладжений сигнал, dBm (−40 поруч, −90 ледь видно). */
  rssi: number;
}

export interface ProximityReport {
  bluetooth: BluetoothState;
  devices: NearbyDevice[];
}

export type AgentToMacMessage =
  | { type: 'ready'; data: { port: number } }
  | { type: 'command'; data: CommandRequest & { id: string; source: SessionSource } }
  /** Повне дерево UI (scope local) для SwiftUI; шлеться при кожній зміні. */
  | { type: 'tree'; data: import('./ui').UiTree }
  /** Усі налаштування модулів `<module>.<key>` → значення: Mac застосовує їх у себе. */
  | { type: 'settings'; data: Record<string, import('./modules').SettingValue> }
  /** Сполучені пристрої і поточне посилання сполучення: лише для Mac-аппки, у веб не йде. */
  | { type: 'devices'; data: DevicesSnapshot }
  /** Звідки агент узяв ключі (Envify, relay.env, process.env) і стан Envify: лише для Mac-аппки, без секретів. */
  | { type: 'secrets'; data: SecretsSnapshot }
  /** Довірені мережі Wi-Fi з SQLite агента: шлеться на старті й після кожної зміни. */
  | { type: 'trustedNetworks'; data: { ssids: string[] } }
  /** Вебхуки з SQLite агента зі станом і лічильниками: на старті й після кожної зміни. */
  | { type: 'webhooks'; data: { webhooks: import('./webhooks').WebhookInfo[] } }
  /** Сам інстанс сервера агента (процес, навантаження, порти, звідки віддає веб): на старті й раз на 10 с. Лише для Mac-аппки. */
  | { type: 'server'; data: ServerInfo }
  | { type: 'serverCharts'; data: ServerCharts }
  | { type: 'serverChartsTick'; data: ServerChartsTick }
  /** Live-тік графіків SDUI-дерева Mac (сторінки статистики): поточний бакет кожного графіка, раз на 10 с. */
  | { type: 'chartTick'; data: ChartTick };

/**
 * Поточний бакет графіків дерева одного вікна періоду: id вузла `chart` → точки серій. Аппка замінює точки з тим
 * самим `start` і серією або дописує їх і відкидає все раніше `from`. Веб тіків не отримує: він опитує дерево.
 */
export interface ChartTick {
  from: string;
  points: Record<string, import('./ui').UiChartPoint[]>;
}

/** Період графіків статистики: Година (хвилинні бакети), Сьогодні (години), 7 і 30 днів (дні). */
export type StatsPeriod = 'hour' | 'today' | 'week' | 'month';

/** Графіки сторінки «Сервер» за період: навантаження (середнє за бакет), запити, помилки, старти. */
export interface ServerCharts {
  period: StatsPeriod;
  /** Вікно [from, to): усі бакети, порожні теж. */
  from: string;
  to: string;
  charts: import('./ui').UiChart[];
}

/**
 * Live-тік: лише поточний бакет кожного графіка (id графіка → точки серій). Аппка замінює ним бакет з тим самим
 * початком або дописує новий і відкидає все раніше `from` (вікно «Година» зсувається).
 */
export interface ServerChartsTick {
  period: StatsPeriod;
  from: string;
  points: Record<string, import('./ui').UiChartPoint[]>;
}

/** Звідки агент роздає локальний Web UI. `published` — `scripts/publish-web-local.sh`, `bundle` — збірка в аппці. */
export interface ServerWebInfo {
  source: 'published' | 'bundle' | null;
  dir: string | null;
  /** Коли зібрано (mtime index.html). */
  builtAt: string | null;
}

/** Навантаження процесу агента за останній інтервал знімка. */
export interface ServerUsage {
  /** CPU процесу, % одного ядра за інтервал. */
  cpu: number;
  /** Пам'ять процесу (RSS), байти. */
  rss: number;
  /** Зайнята купа V8, байти. */
  heapUsed: number;
  /** loadavg Mac за 1 хв. */
  load: number;
}

/** Інстанс сервера агента: не бізнес-логіка (вона — сторінки модуля «Агент»), а сам процес. */
export interface ServerInfo {
  pid: number;
  /** Версія Node (`v26.13.1`). */
  node: string;
  stage: string;
  startedAt: string;
  usage: ServerUsage;
  ports: { https: number; http: number; tailnet: number };
  web: ServerWebInfo;
  stats: ServerStats;
}

/** Лічильники сервера зі stats-рушія (UTC-день). */
export interface ServerStats {
  /** Шлях (`loopback` | `lan` | `tailnet`) → клас відповіді (`2xx`…) → запити. */
  requests: import('./stats').StatTotals;
  starts: { today: number; total: number };
}

/** Звідки взявся ключ: process.env, Envify, файл у ~/.config/awake, або його немає. */
export type SecretSource = 'env' | 'envify' | 'file' | null;

/** Стан Envify в агенті. `off` — токена немає. */
export interface EnvifyStatus {
  state: 'off' | 'loading' | 'ok' | 'error';
  /** Envify цього stage. */
  url: string | null;
  error: string | null;
  /** Скільки змінних прийшло з Envify. */
  count: number;
  loadedAt: string | null;
}

/** Один ключ: ім'я змінної, звідки він і значення (для секретів завжди null). */
export interface SecretKeyInfo {
  name: string;
  source: SecretSource;
  secret: boolean;
  value: string | null;
}

export interface SecretsSnapshot {
  envify: EnvifyStatus;
  /** Глобальні секрети аппки (токен воркспейсу webhooxy, ключ JWT): лише звідки, без значень. */
  keys: SecretKeyInfo[];
}

/** Сполучений браузер: токен лежить лише в ньому, тут опис і коли його бачили. */
export interface DeviceInfo {
  id: number;
  /** Коротко з User-Agent: «Chrome · macOS». */
  name: string;
  userAgent: string | null;
  createdAt: string;
  lastSeenAt: string | null;
  /** Яким шляхом сполучили. */
  via: DevicePairingMode;
}

/**
 * Як пристрій заходить на Mac. `local` — напряму по http у тій самій довіреній Wi-Fi;
 * `tailnet` — через Tailscale (`tailscale serve`, https на `*.ts.net`) з будь-якої мережі, лише пристрої власника;
 * `remote` — через Web UI на Vercel і relay webhooxy (вимкнений, поки webhooxy вимкнено в агенті).
 */
export type DevicePairingMode = 'local' | 'tailnet' | 'remote';

/**
 * Посилання для сполучення нового пристрою або чому його зараз немає.
 * `untrusted` / `noNetwork` — для local; `tailnetOff` — Tailscale не запущений або serve вимкнений, для tailnet;
 * `relayOff` — relay вимкнений або не налаштований, `disabled` — webhooxy вимкнено в агенті зовсім, для remote.
 */
export type DevicePairing =
  | { url: string; expiresAt: string }
  | { url: null; reason: 'untrusted' | 'noNetwork' | 'tailnetOff' | 'relayOff' | 'disabled' };

/** Пристрій відкрив посилання з QR і чекає, поки на Mac підтвердять, що це ти. */
export interface DevicePairingRequest {
  id: string;
  name: string;
  userAgent: string | null;
  createdAt: string;
  /** Після цього запит без відповіді протухає. */
  expiresAt: string;
  via: DevicePairingMode;
}

export interface DevicesSnapshot {
  devices: DeviceInfo[];
  requests: DevicePairingRequest[];
  /** Одне посилання на кожен шлях. Коди окремі: локальний код не приймається через relay і навпаки. */
  pairing: Record<DevicePairingMode, DevicePairing>;
}

/** Відповідь агента пристрою, що чекає підтвердження. Токен приходить лише раз, разом з approved. */
export interface DevicePairingPoll {
  status: 'pending' | 'approved' | 'denied' | 'expired';
  /** Лише для LAN (Bearer). Через Tailscale токен не віддається: агент ставить кукі `mc_device` і `mc_session`. */
  token?: string;
}


/**
 * Префікс усіх ключів MaControl у Redis. База Upstash спільна з іншими проєктами (envify),
 * тож ключ без префікса не пишемо: новий ключ — лише як `${REDIS_KEY_PREFIX}<name>`.
 */
export const REDIS_KEY_PREFIX = 'macontrol:';

/** Дерево UI для Web UI на Vercel (лише вузли зі scope all). Vercel лише читає його: керування йде на самому агенті. */
export const UI_TREE_KEY = `${REDIS_KEY_PREFIX}ui`;
