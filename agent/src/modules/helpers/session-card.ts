import { defineProps, showUnless, showWhen } from '@macontrol/contracts';
import type { MacState, StatePath, UiButton, UiButtons, UiTimer, UiTone } from '@macontrol/contracts';
import { formatClock } from './format-clock';

/**
 * Гілка сесії в AppState і шляхи її кінця й початку. Таймер і кнопки перемикаються за нею через `show` / `bind`,
 * тож layout сторінки не залежить від того, чи сесія йде.
 */
export interface SessionStatePaths {
  session: 'sessions.awake' | 'sessions.sleeper';
  until: StatePath;
  from: StatePath;
}

/** Таймер і кнопки сесії модуля (Awake, Sleeper): однакова поведінка, різні тексти й колір. */
export interface SessionCard {
  module: string;
  mac: MacState | null;
  paths: SessionStatePaths;
  /** Тривалість тієї сесії, яку запустить «Старт» за поточними налаштуваннями. */
  plannedSeconds: number;
  now: Date;
  tone: UiTone;
  timerId: string;
  buttonsId: string;
  /** Чому сесію зараз не почати (бракує дозволу): «Старт» тоді неактивний. Зупинити можна завжди. */
  blocked?: string | null;
  texts: {
    running: string;
    /** Перед часом кінця під відліком: «Не спить до» → «Не спить до 14:30». */
    untilCaption: string;
    /** Підпис без сесії: до котрої триватиме та, яку запустить «Старт». */
    idleCaption: (end: string) => string;
    stop: string;
  };
}

/**
 * Без сесії — тривалість і кінець тієї, яку запустить «Старт»; поки сесія йде — відлік, кінець і початок зі стейту.
 * Обидва вузли завжди в layout, видно один (`show`). Mac офлайн — один сірий таймер.
 */
export function sessionTimerNodes(card: SessionCard): UiTimer[] {
  const { mac, paths, timerId: id } = card;
  if (mac === null) return [{ id, type: 'timer', value: '—', caption: 'Mac офлайн', tone: 'gray' }];
  const end = new Date(card.now.getTime() + card.plannedSeconds * 1000);
  return [
    {
      id: `${id}-idle`,
      type: 'timer',
      value: formatSpan(card.plannedSeconds),
      caption: card.texts.idleCaption(formatClock(end.toISOString())),
      tone: 'gray',
      show: showWhen(paths.session, 'null'),
    },
    {
      id,
      type: 'timer',
      value: card.texts.running,
      untilCaption: card.texts.untilCaption,
      tone: card.tone,
      show: showUnless(paths.session, 'null'),
      bind: defineProps<UiTimer>({ until: paths.until, from: paths.from }),
    },
  ];
}

/**
 * Без сесії — «Старт»; поки йде — «Стоп» і «Старт», який перезапускає сесію з поточними налаштуваннями (сервер
 * сприймає старт на ходу як перезапуск). Без підтверджень (owner, 2026-11-28).
 */
export function sessionButtons(card: SessionCard): UiButtons[] {
  const { module, mac, paths } = card;
  const start: UiButton = {
    id: 'start',
    label: 'Старт',
    variant: 'filled',
    disabled: mac === null || Boolean(card.blocked),
    action: { module, name: 'start' },
  };
  const stop: UiButton = { id: 'stop', label: card.texts.stop, variant: 'destructive', action: { module, name: 'stop' } };
  return [
    { id: card.buttonsId, type: 'buttons', buttons: [start], show: showWhen(paths.session, 'null') },
    { id: `${card.buttonsId}-run`, type: 'buttons', buttons: [stop, start], show: showUnless(paths.session, 'null') },
  ];
}

/** «2:00:00» для запланованої тривалості. */
function formatSpan(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}:${String(m).padStart(2, '0')}:00`;
}

