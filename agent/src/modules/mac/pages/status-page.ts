import type { MacState, UiPage, UiRow } from '@awake/contracts';
import type { ModuleContext } from '../../types/mac-module';
import { sleepRow } from '../../awake/helpers/sleep-row';
import { formatBattery } from '../../awake/helpers/format-battery';
import { powerLabel } from '../../awake/helpers/power-label';
import { thermalPresentation } from '../../awake/helpers/thermal-presentation';

export function buildStatusPage(ctx: ModuleContext): UiPage {
  const mac = ctx.mac;
  return {
    id: 'status',
    module: 'mac',
    title: 'Стан Mac',
    icon: { symbol: 'waveform.path.ecg', tone: 'green' },
    group: 'system',
    children: [
      {
        id: 'rows',
        type: 'section',
        children: mac === null ? [{ id: 'no-data', type: 'row', label: 'Немає даних' }] : macRows(mac),
      },
      // Стосується Mac загалом, а не сесії: попередження приходить і без Awake.
      { id: 'warnings', type: 'section', title: 'Попередження', children: [ctx.settingNode('batteryWarn')] },
    ],
  };
}

function macRows(mac: MacState): UiRow[] {
  const thermal = thermalPresentation(mac.thermal);
  return [
    sleepRow(mac),
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
