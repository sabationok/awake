import type {
  MacState,
  SessionRecord,
  UiButton,
  UiList,
  UiPage,
  UiStatus,
} from '@awake/contracts';
import { formatClock } from '../helpers/format-clock';
import { formatElapsed } from '../helpers/format-elapsed';
import { formatSessionStart } from '../helpers/format-session-start';
import { sessionSourceLabel } from '../helpers/session-source-label';

const START_OPTIONS = [
  { duration: '1h', label: '1 год' },
  { duration: '2h', label: '2 год' },
  { duration: '4h', label: '4 год' },
];

export function buildSessionPage(mac: MacState | null, sessions: SessionRecord[]): UiPage {
  const active = mac?.active === true;
  const disabled = mac === null;
  const startButtons: UiButton[] = START_OPTIONS.map(({ duration, label }) => ({
    id: `start-${duration}`,
    label,
    variant: 'filled',
    disabled,
    action: { module: 'awake', name: 'start', params: { duration } },
  }));

  return {
    id: 'session',
    module: 'awake',
    title: 'Сесія',
    icon: { symbol: 'cup.and.saucer.fill', tone: 'orange' },
    group: 'modules',
    children: [
      { id: 'status', type: 'section', children: [statusNode(mac)] },
      {
        id: 'controls',
        type: 'section',
        title: 'Керування',
        footer: active
          ? 'Нова тривалість перезапускає сесію з нуля.'
          : 'Mac не спатиме обраний час, навіть із закритою кришкою.',
        children: [
          { id: 'start', type: 'buttons', buttons: startButtons },
          {
            id: 'session-actions',
            type: 'buttons',
            buttons: [
              {
                id: 'stop',
                label: 'Стоп',
                variant: 'destructive',
                disabled: disabled || !active,
                action: { module: 'awake', name: 'stop' },
              },
              { id: 'lock', label: 'Заблокувати', variant: 'plain', disabled, action: { module: 'awake', name: 'lock' } },
              {
                id: 'display-off',
                label: 'Екран',
                variant: 'plain',
                disabled,
                action: { module: 'awake', name: 'displayOff' },
              },
            ],
          },
        ],
      },
      {
        id: 'history',
        type: 'section',
        title: 'Сесії',
        children: [{ id: 'sessions', type: 'list', items: sessions.map(sessionItem), empty: 'Ще не було жодної сесії' }],
      },
    ],
  };
}

function statusNode(mac: MacState | null): UiStatus {
  if (mac === null) {
    return {
      id: 'session-status',
      type: 'status',
      label: 'Mac офлайн',
      tone: 'gray',
      hint: 'Mac вимкнений, спить або MacCC не запущений',
    };
  }
  if (mac.active) {
    const parts = [mac.until ? `до ${formatClock(mac.until)}` : null, mac.duration];
    return {
      id: 'session-status',
      type: 'status',
      label: 'Не спить',
      tone: 'green',
      pulse: true,
      countdownTo: mac.until,
      hint: parts.filter((part): part is string => part !== null).join(' · '),
    };
  }
  return { id: 'session-status', type: 'status', label: 'Сесія не активна', tone: 'gray', value: '—' };
}

function sessionItem(session: SessionRecord): UiList['items'][number] {
  const parts = [
    sessionSourceLabel(session.source),
    session.duration,
    session.endReason ?? (session.endedAt ? null : 'триває'),
  ];
  return {
    id: String(session.id),
    label: formatSessionStart(session.startedAt),
    hint: parts.filter((part): part is string => part !== null).join(' · '),
    value: formatElapsed(session.startedAt, session.endedAt ?? new Date().toISOString()),
  };
}
