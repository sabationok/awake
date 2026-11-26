import type { UiNode, UiPage } from '@awake/contracts';
import { MAC_ONLY_HINT, WEB_UI_MODULE } from '../constants/web-ui';
import { formatWhen } from '../helpers/format-when';
import { webUiAction } from '../helpers/web-ui-action';
import type { WebUiSnapshot } from '../types/web-ui-snapshot.types';

/** «Вхід»: чи задано пароль Web UI і хто зараз увійшов. Завершити чужу сесію можна лише з Mac. */
export function buildLoginPage(snapshot: WebUiSnapshot): UiPage {
  const sessions: UiNode[] = snapshot.sessions.flatMap((session): UiNode[] => [
    {
      id: `webui-session-${session.id}`,
      type: 'row',
      label: session.deviceName,
      value: `активна ${formatWhen(session.lastActiveAt)}`,
      hint: `Згасне ${formatWhen(session.expiresAt)}, якщо не буде запитів.`,
      icon: { symbol: 'person.badge.key.fill', tone: 'accent' },
    },
    {
      id: `webui-session-${session.id}-actions`,
      type: 'buttons',
      scope: 'mac',
      buttons: [
        {
          id: `webui-session-end-${session.id}`,
          label: `Завершити «${session.deviceName}»`,
          variant: 'plain',
          confirm: 'Пристрою доведеться ввести пароль знову.',
          action: webUiAction('endSession', { id: session.id }),
        },
      ],
    },
  ]);
  if (!sessions.length) sessions.push({ id: 'webui-sessions-empty', type: 'text', text: 'Зараз ніхто не увійшов.', tone: 'gray' });
  return {
    id: 'webui-login',
    module: WEB_UI_MODULE,
    title: 'Вхід',
    icon: { symbol: 'key.fill', tone: 'orange' },
    group: 'modules',
    scope: 'local',
    children: [
      {
        id: 'webui-password',
        type: 'section',
        title: 'Пароль',
        footer: 'Пароль питають при вході через Tailscale. Щонайменше 12 символів; коротший вважається незаданим.',
        children: [
          {
            id: 'webui-password-state',
            type: 'row',
            label: 'Пароль Web UI',
            value: snapshot.passwordSet ? 'Задано' : 'Не задано',
            hint: MAC_ONLY_HINT,
            icon: { symbol: 'key.fill', tone: 'orange' },
            dot: { tone: snapshot.passwordSet ? 'green' : 'red' },
          },
        ],
      },
      { id: 'webui-sessions', type: 'section', title: 'Активні вебсесії', children: sessions },
    ],
  };
}
