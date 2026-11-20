import type { MacState, UiPage, UiRow } from '@awake/contracts';
import { formatBattery } from '../helpers/format-battery';
import { powerLabel } from '../helpers/power-label';
import { thermalPresentation } from '../helpers/thermal-presentation';

export function buildStatusPage(mac: MacState | null): UiPage {
  return {
    id: 'status',
    module: 'awake',
    title: 'Стан',
    icon: { symbol: 'waveform.path.ecg', tone: 'green' },
    group: 'modules',
    children: [
      {
        id: 'rows',
        type: 'section',
        children: mac === null ? [{ id: 'no-data', type: 'row', label: 'Немає даних' }] : macRows(mac),
      },
    ],
  };
}

function macRows(mac: MacState): UiRow[] {
  const thermal = thermalPresentation(mac.thermal);
  return [
    {
      id: 'battery',
      type: 'row',
      label: 'Батарея',
      value: formatBattery(mac.battery),
      icon: { symbol: 'battery.75', tone: 'green' },
    },
    {
      id: 'power',
      type: 'row',
      label: 'Живлення',
      value: powerLabel(mac.power),
      icon: { symbol: 'powerplug.fill', tone: 'accent' },
    },
    {
      id: 'thermal',
      type: 'row',
      label: 'Температура',
      value: thermal.label,
      icon: { symbol: 'thermometer.medium', tone: thermal.tone },
    },
    {
      id: 'lid',
      type: 'row',
      label: 'Кришка',
      value: mac.lidClosed ? 'Закрита' : 'Відкрита',
      icon: { symbol: 'laptopcomputer', tone: 'gray' },
    },
    {
      id: 'network',
      type: 'row',
      scope: 'local',
      label: 'Мережа',
      value: `${mac.ssid ?? '—'}${mac.trusted ? ' · довірена' : ''}`,
      icon: { symbol: 'wifi', tone: 'accent' },
    },
  ];
}
