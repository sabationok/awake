import type { MacState, UiButton, UiButtons, UiTimer, UiTone } from '@awake/contracts';
import { formatClock } from './format-clock';

/** Сесія, що йде зараз: відлік від `from` до `until`; `changed` — у вкладках вибрано інший час. */
export interface SessionCardRun {
  until: string | null;
  from: string | null;
  changed: boolean;
}

/** Таймер і кнопки сесії модуля (Awake, Sleeper): однакова поведінка, різні тексти й колір. */
export interface SessionCard {
  module: string;
  mac: MacState | null;
  /** null — сесії немає, таймер показує заплановану тривалість. */
  run: SessionCardRun | null;
  plannedSeconds: number;
  now: Date;
  tone: UiTone;
  timerId: string;
  buttonsId: string;
  /** Чому сесію зараз не почати (бракує дозволу): «Старт» тоді неактивний. Зупинити можна завжди. */
  blocked?: string | null;
  texts: {
    running: string;
    /** Підпис під відліком, коли сесія йде. */
    runningCaption: (until: string) => string;
    /** Підпис без сесії: до котрої триватиме та, яку запустить «Старт». */
    idleCaption: (end: string) => string;
    stop: string;
  };
}

/** Відлік, поки сесія йде; без сесії — тривалість і кінець тієї, яку запустить «Старт». */
export function sessionTimerNode(card: SessionCard): UiTimer {
  const { mac, run, timerId: id } = card;
  if (mac === null) return { id, type: 'timer', value: '—', caption: 'Mac офлайн', tone: 'gray' };
  if (run) {
    return {
      id,
      type: 'timer',
      until: run.until,
      from: run.from,
      value: card.texts.running,
      caption: run.until ? card.texts.runningCaption(formatClock(run.until)) : undefined,
      tone: card.tone,
    };
  }
  const end = new Date(card.now.getTime() + card.plannedSeconds * 1000).toISOString();
  return {
    id,
    type: 'timer',
    value: formatSpan(card.plannedSeconds),
    caption: card.texts.idleCaption(formatClock(end)),
    tone: 'gray',
  };
}

/** Старт; коли сесія йде — Стоп, а якщо вибрано інший час, ще й «Перезапустити». */
export function sessionButtons(card: SessionCard): UiButtons {
  const { module, mac, run } = card;
  const start = (label: string): UiButton => ({
    id: 'start',
    label,
    variant: 'filled',
    disabled: mac === null || Boolean(card.blocked),
    action: { module, name: 'start' },
  });
  const stop: UiButton = { id: 'stop', label: card.texts.stop, variant: 'destructive', action: { module, name: 'stop' } };
  const buttons = !run ? [start('Старт')] : run.changed ? [start('Перезапустити'), stop] : [stop];
  return { id: card.buttonsId, type: 'buttons', buttons };
}

/** «2:00:00» для запланованої тривалості. */
function formatSpan(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}:${String(m).padStart(2, '0')}:00`;
}
