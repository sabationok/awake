import type { UiPage } from '@awake/contracts';
import type { ModuleContext } from '../../types/mac-module';

export function buildSafetyPage(ctx: ModuleContext): UiPage {
  return {
    id: 'safety',
    module: 'awake',
    title: 'Безпека',
    icon: { symbol: 'shield.fill', tone: 'accent' },
    group: 'modules',
    children: [
      {
        id: 'session',
        type: 'section',
        title: 'Сесія',
        children: [
          ctx.settingNode('lockOnLidClose'),
          ctx.settingNode('batteryStop'),
          {
            id: 'thermal-stop',
            type: 'row',
            label: 'Повернути сон при перегріві',
            value: 'Критичний',
            icon: { symbol: 'flame.fill', tone: 'orange' },
          },
        ],
      },
      {
        id: 'mac-state',
        type: 'section',
        title: 'Стан Mac',
        children: [ctx.settingNode('batteryWarn')],
      },
    ],
  };
}
