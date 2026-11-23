import type { BluetoothState, UiNode, UiPage, UiRow, UiStatus, UiTone } from '@awake/contracts';
import { formatClock } from '../../modules/helpers/format-clock';
import type { ModuleContext } from '../../modules/types/mac-module';
import { PROXIMITY_MODULE, PROXIMITY_PAGE } from '../constants/proximity-settings';
import type { ProximityState } from '../types/proximity-state.types';

const BLUETOOTH: Record<BluetoothState, { label: string; tone: UiTone }> = {
  on: { label: 'Увімкнено', tone: 'green' },
  off: { label: 'Вимкнено на Mac', tone: 'orange' },
  unauthorized: { label: 'Немає дозволу — сторінка «Дозвіл»', tone: 'red' },
  unsupported: { label: 'Mac не підтримує Bluetooth LE', tone: 'red' },
  unknown: { label: 'Запускається…', tone: 'gray' },
};

/** «Поруч»: налаштування блокування і що Mac бачить зараз. Лише Mac і локальний Web UI: назви пристроїв особисті. */
export function buildProximityPage(ctx: ModuleContext, state: ProximityState): UiPage {
  return {
    id: PROXIMITY_PAGE,
    module: PROXIMITY_MODULE,
    title: 'Поруч',
    icon: { symbol: 'iphone.radiowaves.left.and.right', tone: 'indigo' },
    group: 'modules',
    scope: 'local',
    children: [
      ...absenceSection(state),
      ...(state.config.enabled ? [{ id: 'status', type: 'section', children: statusRows(state) } as UiNode] : []),
      {
        id: 'settings',
        type: 'section',
        title: 'Блокування',
        children: [
          ctx.settingNode('enabled'),
          ctx.settingNode('device'),
          ctx.settingNode('range'),
          ctx.settingNode('delay'),
          ctx.settingNode('when'),
        ],
      },
      {
        id: 'about',
        type: 'text',
        text: 'Спарте iPhone чи Apple Watch з Mac у Системних параметрах → Bluetooth, інакше iOS міняє адресу і Mac його губить. Розблоковує лише пароль або Apple Watch.',
      },
    ],
  };
}

/**
 * Плашка про відсутність: чого бракує, щоб блокування спрацювало, або куди йде відлік до блокування.
 * Вимкнений модуль нічого не дублює: стан показує перемикач нижче. Одна плашка, найважливіша причина.
 */
function absenceSection(state: ProximityState): UiNode[] {
  const banner = absenceBanner(state, Date.now());
  return banner ? [{ id: 'absence', type: 'section', children: [banner] }] : [];
}

function absenceBanner(state: ProximityState, now: number): UiStatus | null {
  const { config } = state;
  if (!config.enabled) return null;
  const warn = (label: string, hint: string, tone: UiTone): UiStatus => ({
    id: 'absence-banner',
    type: 'status',
    label,
    hint,
    tone,
    icon: { symbol: 'exclamationmark.triangle', tone },
  });

  if (state.bluetooth !== 'on') {
    const reason = state.bluetooth === null ? { label: 'Аппка не надсилає даних', tone: 'gray' as UiTone } : BLUETOOTH[state.bluetooth];
    return warn('Блокування не працює', reason.label, reason.tone);
  }
  if (config.device === '') return warn('Пристрій не вибрано', 'Mac не блокуватиме, доки не вибрано iPhone чи Watch', 'orange');
  if (!state.watching) return warn('Не стежить', 'Блокування лише під час сесії', 'gray');
  if (state.farSince === null) return null;

  const name = state.targetName ?? 'Пристрій';
  const lockAt = Date.parse(state.farSince) + config.delayMs;
  if (now >= lockAt) return warn(`Заблоковано: ${name} далеко`, `з ${formatClock(state.farSince)}`, 'indigo');
  return { ...warn(`${name} ${state.target ? 'далеко' : 'не видно'}`, 'Mac заблокується, якщо не повернеться', 'orange'), countdownTo: new Date(lockAt).toISOString() };
}

function statusRows(state: ProximityState): UiRow[] {
  const { config } = state;
  const bluetooth = state.bluetooth === null ? { label: 'Аппка не надсилає даних', tone: 'gray' as UiTone } : BLUETOOTH[state.bluetooth];
  return [
    { id: 'bluetooth', type: 'row', label: 'Bluetooth', value: bluetooth.label, dot: { tone: bluetooth.tone } },
    {
      id: 'device',
      type: 'row',
      label: state.targetName ?? 'Пристрій не вибрано',
      value: deviceValue(state),
      icon: { symbol: 'iphone', tone: state.target && state.target.rssi >= config.range ? 'green' : 'orange' },
    },
    {
      id: 'watching',
      type: 'row',
      label: 'Стеження',
      value: watchingValue(state),
      icon: { symbol: 'eye', tone: state.watching ? 'accent' : 'gray' },
    },
    {
      id: 'last-lock',
      type: 'row',
      label: 'Останнє блокування',
      value: state.lastLockAt ? formatClock(state.lastLockAt) : '—',
      icon: { symbol: 'lock.fill', tone: 'indigo' },
    },
  ];
}

function deviceValue(state: ProximityState): string {
  if (state.config.device === '') return '';
  if (!state.target) return 'не видно';
  const rssi = Math.round(state.target.rssi);
  return `${rssi} dBm · ${rssi >= state.config.range ? 'поруч' : 'далеко'}`;
}

function watchingValue(state: ProximityState): string {
  if (state.config.device === '') return 'виберіть пристрій';
  if (!state.watching) return state.config.when === 'session' ? 'чекає на сесію' : 'чекає на Bluetooth';
  return state.farSince ? `далеко з ${formatClock(state.farSince)}` : 'активне';
}
