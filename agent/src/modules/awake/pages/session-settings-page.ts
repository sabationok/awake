import type { UiPage } from '@awake/contracts';
import type { ModuleContext } from '../../types/mac-module';

/** «Налаштування сесії»: лише те, як поводиться сесія Awake (екран, кришка, коли повернути сон). */
export function buildSessionSettingsPage(ctx: ModuleContext): UiPage {
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
        children: [ctx.settingNode('displayOff'), ctx.settingNode('lockOnLidClose')],
      },
      {
        id: 'restore-sleep',
        type: 'section',
        title: 'Повернути сон',
        children: [
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
    ],
  };
}
