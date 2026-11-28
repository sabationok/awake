import { defineProps, showUnless, showWhen } from '@macontrol/contracts';
import type { UiNode, UiTimer } from '@macontrol/contracts';
import type { ModuleContext } from '../../types/mac-module';

/** Таймер сну йде / ні: за цією гілкою AppState перемикаються рядок стану і кнопки меню. */
const SESSION = 'sessions.sleeper';

/** Пункти Sleeper в меню Dock: поки таймер йде — «Засне о HH:MM» і «Скасувати», без нього — «Старт». */
export function sleepDockMenu(ctx: ModuleContext): UiNode[] {
  return [
    {
      id: 'status',
      type: 'timer',
      value: 'Засинає',
      untilCaption: 'Засне о',
      show: showUnless(SESSION, 'null'),
      bind: defineProps<UiTimer>({ until: 'sessions.sleeper.sleepAt' }),
    },
    {
      id: 'run',
      type: 'buttons',
      show: showUnless(SESSION, 'null'),
      buttons: [{ id: 'stop', label: 'Скасувати', variant: 'destructive', action: { module: 'sleep', name: 'stop' } }],
    },
    {
      id: 'idle',
      type: 'buttons',
      show: showWhen(SESSION, 'null'),
      buttons: [{ id: 'start', label: 'Старт', variant: 'filled', disabled: ctx.mac === null, action: { module: 'sleep', name: 'start' } }],
    },
  ];
}
