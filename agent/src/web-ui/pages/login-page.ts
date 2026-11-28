import type { SecretSource, UiNode, UiPage } from '@macontrol/contracts';
import { menuItem } from '../../modules/helpers/menu-item';
import { MIN_PASSWORD_LENGTH } from '../../web-auth/constants/web-auth';
import { MAC_ONLY_HINT, WEB_UI_MODULE } from '../constants/web-ui';
import { formatWhen } from '../helpers/format-when';
import { webUiAction } from '../helpers/web-ui-action';
import type { WebUiSessionRow, WebUiSnapshot } from '../types/web-ui-snapshot.types';

/** Канали входу, як на «Пристроях»: сесія належить каналу, через який сполучено її пристрій. */
const CHANNELS: { via: string; title: string }[] = [
  { via: 'local', title: 'Local' },
  { via: 'tailnet', title: 'Priv · Tailscale' },
  { via: 'remote', title: 'Proxy · Vercel' },
];

const SOURCE_LABEL: Record<Exclude<SecretSource, null>, string> = {
  env: 'з process.env',
  envify: 'з Envify',
  file: 'збережено на цьому Mac',
};

/**
 * «Вхід»: пароль одним рядком (стан праворуч, «Задати» / «Змінити» з інлайн-формою, лише на Mac) і активні
 * вебсесії, розкладені за каналом входу. Завершити чужу сесію можна лише з Mac.
 */
export function buildLoginPage(snapshot: WebUiSnapshot): UiPage {
  return {
    id: 'webui-login',
    module: WEB_UI_MODULE,
    title: 'Вхід',
    icon: { symbol: 'key.fill', tone: 'orange' },
    group: 'modules',
    scope: 'local',
    children: [
      passwordSection(snapshot),
      ...CHANNELS.map(({ via, title }) => sessionsSection(via, title, snapshot.sessions.filter((session) => session.via === via))),
    ],
  };
}

function passwordSection(snapshot: WebUiSnapshot): UiNode {
  const source = snapshot.passwordSource;
  const fromEnv = source === 'env' || source === 'envify';
  return {
    id: 'webui-password',
    type: 'section',
    title: 'Пароль і ключі',
    footer: 'Пароль питають при вході через Tailscale. Значення зберігаються лише на Mac і ніколи не показуються.',
    children: [
      {
        id: 'webui-password-state',
        type: 'item',
        title: 'Пароль Web UI',
        icon: { symbol: 'key.fill', tone: 'orange' },
        status: snapshot.passwordSet ? { label: 'Задано', tone: 'green' } : { label: 'Не задано', tone: 'red' },
        ...(source ? { tags: [{ label: SOURCE_LABEL[source], tone: 'gray' as const }] } : {}),
        comment: fromEnv ? 'Пароль прийшов з конфігу; форма його не перебиває.' : `Щонайменше ${MIN_PASSWORD_LENGTH} символів. Зміна — через Touch ID.`,
        actions: [
          menuItem('webui-password-edit', snapshot.passwordSet ? 'Змінити' : 'Задати', webUiAction('setPassword', {}), {
            variant: snapshot.passwordSet ? 'default' : 'accent',
            scope: 'mac',
            hint: MAC_ONLY_HINT,
            disabled: fromEnv,
            form: {
              title: 'Пароль Web UI',
              submit: 'Зберегти',
              fields: [
                {
                  name: 'password',
                  label: 'Новий пароль',
                  kind: 'password',
                  placeholder: `щонайменше ${MIN_PASSWORD_LENGTH} символів`,
                  required: true,
                  minLength: MIN_PASSWORD_LENGTH,
                },
                {
                  name: 'repeat',
                  label: 'Повторіть пароль',
                  kind: 'password',
                  required: true,
                  sameAs: 'password',
                  hint: 'Після «Зберегти» Mac попросить Touch ID.',
                },
              ],
            },
          }),
        ],
      },
      jwtKeyNode(snapshot),
    ],
  };
}

/** Ключ JWT: підписує квитки входу у Web UI (через relay). Одне поле — форма в рядку, зміна через Touch ID. */
function jwtKeyNode(snapshot: WebUiSnapshot): UiNode {
  const { configured, source } = snapshot.jwtKey;
  const fromEnv = source === 'env' || source === 'envify';
  return {
    id: 'webui-jwt-key',
    type: 'item',
    title: 'Ключ JWT',
    icon: { symbol: 'signature', tone: 'indigo' },
    status: configured ? { label: 'Задано', tone: 'green' } : { label: 'Не задано', tone: 'gray' },
    ...(source ? { tags: [{ label: SOURCE_LABEL[source], tone: 'gray' as const }] } : {}),
    comment: fromEnv ? 'Ключ прийшов з конфігу; форма його не перебиває.' : 'Підписує квитки входу у Web UI через relay. Зміна — через Touch ID.',
    actions: [
      menuItem('webui-jwt-key-edit', configured ? 'Змінити' : 'Задати', webUiAction('setJwtKey', {}), {
        variant: configured ? 'default' : 'accent',
        scope: 'mac',
        hint: MAC_ONLY_HINT,
        disabled: fromEnv,
        form: { title: 'Ключ JWT', submit: 'Зберегти', fields: [{ name: 'key', label: 'Новий ключ', kind: 'password', placeholder: 'ключ HS256', required: true }] },
      }),
    ],
  };
}

function sessionsSection(via: string, title: string, sessions: WebUiSessionRow[]): UiNode {
  return {
    id: `webui-sessions-${via}`,
    type: 'section',
    title: `${title} · ${sessions.length}`,
    children: sessions.length
      ? sessions.map(
          (session): UiNode => ({
            id: `webui-session-${session.id}`,
            type: 'item',
            title: session.deviceName,
            icon: { symbol: 'person.badge.key.fill', tone: 'accent' },
            status: { label: 'Активна', tone: 'green' },
            comment: `Запит ${formatWhen(session.lastActiveAt)} · згасне ${formatWhen(session.expiresAt)}, якщо не буде запитів`,
            actions: [
              menuItem(`webui-session-end-${session.id}`, 'Завершити', webUiAction('endSession', { id: session.id }), {
                variant: 'danger',
                scope: 'mac',
                hint: MAC_ONLY_HINT,
                confirm: { title: 'Завершити сесію?', text: 'Пристрою доведеться ввести пароль знову.', ok: 'Завершити' },
              }),
            ],
          }),
        )
      : [{ id: `webui-sessions-${via}-empty`, type: 'text', text: 'Зараз ніхто не увійшов.', tone: 'gray' }],
  };
}
