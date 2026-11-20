import type { UiPage } from '@awake/contracts';
import type { ModuleContext } from '../../types/mac-module';

export function buildDisplayPage(ctx: ModuleContext): UiPage {
  return {
    id: 'display',
    module: 'awake',
    title: 'Дисплей',
    icon: { symbol: 'display', tone: 'accent' },
    group: 'modules',
    children: [
      {
        id: 'screen',
        type: 'section',
        title: 'Екран',
        footer:
          'Із закритою кришкою вбудований екран гасне одразу. Цей параметр діє, коли кришка відкрита або підключено зовнішній монітор. «Як у системі» означає налаштування з розділу «Замкнений екран».',
        children: [
          ctx.settingNode('displayOff'),
          {
            id: 'display-off-now',
            type: 'row',
            label: 'Погасити екран зараз',
            control: {
              type: 'button',
              button: {
                id: 'display-off',
                label: 'Погасити',
                variant: 'plain',
                disabled: ctx.mac === null,
                action: { module: 'awake', name: 'displayOff' },
              },
            },
          },
        ],
      },
    ],
  };
}
