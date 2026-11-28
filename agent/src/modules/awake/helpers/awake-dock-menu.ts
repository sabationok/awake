import { defineProps, showUnless, showWhen } from '@macontrol/contracts';
import type { UiButton, UiNode, UiTimer } from '@macontrol/contracts';
import type { ModuleContext } from '../../types/mac-module';

/** Сесія Awake йде / ні: за цією гілкою AppState перемикаються рядок стану і кнопки меню. */
const SESSION = 'sessions.awake';

/**
 * Пункти Awake в меню Dock. Поки сесія йде — «Не спить до HH:MM» (кінець зі стейту; безстрокова — «Не спить»),
 * «Стоп» і «Старт» (перезапуск, без підтверджень); без сесії — «Старт». Далі «Погасити екран зараз» і «Заблокувати
 * Mac», а «Повернути сон» — лише коли сон вимкнено поза сесією (`system.sleepBlockedOutside`).
 */
export function awakeDockMenu(ctx: ModuleContext): UiNode[] {
  const offline = ctx.mac === null;
  const start: UiButton = {
    id: 'start',
    label: 'Старт',
    variant: 'filled',
    disabled: offline || ctx.missingPermission('sleepControl') !== null,
    action: { module: 'awake', name: 'start' },
  };
  const stop: UiButton = { id: 'stop', label: 'Стоп', variant: 'destructive', action: { module: 'awake', name: 'stop' } };
  return [
    {
      id: 'status',
      type: 'timer',
      value: 'Не спить',
      untilCaption: 'Не спить до',
      show: showUnless(SESSION, 'null'),
      bind: defineProps<UiTimer>({ until: 'sessions.awake.until' }),
    },
    { id: 'run', type: 'buttons', buttons: [stop, start], show: showUnless(SESSION, 'null') },
    { id: 'idle', type: 'buttons', buttons: [start], show: showWhen(SESSION, 'null') },
    {
      id: 'now',
      type: 'buttons',
      buttons: [
        { id: 'display-off', label: 'Погасити екран зараз', variant: 'plain', disabled: offline, action: { module: 'awake', name: 'displayOff' } },
        { id: 'lock', label: 'Заблокувати Mac', variant: 'plain', disabled: offline, action: { module: 'awake', name: 'lock' } },
      ],
    },
    {
      id: 'restore-sleep',
      type: 'buttons',
      show: showWhen('system.sleepBlockedOutside', 'true'),
      buttons: [{ id: 'restore', label: 'Повернути сон', variant: 'plain', action: { module: 'awake', name: 'restoreSleep' } }],
    },
  ];
}
