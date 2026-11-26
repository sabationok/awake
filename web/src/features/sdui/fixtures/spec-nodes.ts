import type { UiNode } from '@awake/contracts';

/** Приклади з docs/specs/ui-actions-and-forms-spec.md для ручної перевірки компонентів (dev-сторінка /dev/sdui). */
export const SPEC_PREVIEW_NODES: UiNode[] = [
  {
    id: 'perm',
    type: 'section',
    title: 'Дозволи',
    children: [
      {
        id: 'perm-temp',
        type: 'item',
        title: 'Читання температури',
        status: { label: 'Видано', tone: 'green' },
        comment: 'Дає статус тиску системи',
        actions: [
          {
            id: 'revoke',
            label: 'Відкликати',
            variant: 'danger',
            action: { module: 'preview', name: 'revoke', params: { permission: 'thermalRead' } },
            confirm: { title: 'Відкликати дозвіл?', text: 'Модулі, що його просять, перестануть працювати.', ok: 'Відкликати' },
          },
        ],
      },
      {
        id: 'perm-sleep',
        type: 'item',
        title: 'Керування сном',
        status: { label: 'Немає', tone: 'gray' },
        actions: [
          {
            id: 'request',
            label: 'Запит',
            variant: 'accent',
            scope: 'mac',
            hint: 'Змінити можна лише в аппці на Mac',
            action: { module: 'preview', name: 'request', params: { permission: 'sleepControl' } },
          },
        ],
      },
    ],
  },
  {
    id: 'paired',
    type: 'section',
    title: 'Сполучені пристрої',
    children: [
      {
        id: 'paired-chrome',
        type: 'item',
        title: 'Chrome · iPhone',
        status: { label: 'Сполучено', tone: 'green' },
        tags: [{ label: 'Tailscale', tone: 'indigo' }],
        comment: 'Сполучено 22 лист., 18:53 · заходив 22 лист., 18:54',
        actions: [
          {
            id: 'unpair',
            label: 'Відкликати',
            variant: 'danger',
            action: { module: 'preview', name: 'unpair' },
            confirm: { title: 'Відкликати пристрій?', text: 'Пристрій втратить доступ до Web UI.', ok: 'Відкликати' },
          },
        ],
      },
    ],
  },
  {
    id: 'groups',
    type: 'section',
    title: 'Список груп',
    status: { label: 'Підключено', tone: 'green' },
    children: [
      {
        id: 'group-mc',
        type: 'item',
        title: 'MaControl',
        status: { label: 'Активна', tone: 'green' },
        comment: 'Додав 840457248',
        actions: [
          { id: 'deactivate', label: 'Деактивувати', variant: 'default', action: { module: 'preview', name: 'deactivate' } },
          {
            id: 'leave',
            label: 'Вийти з групи',
            variant: 'danger',
            action: { module: 'preview', name: 'leave' },
            confirm: { title: 'Вийти з групи?', text: 'Бот перестане публікувати в цю групу.', ok: 'Вийти' },
          },
        ],
      },
    ],
  },
  {
    id: 'tailscale',
    type: 'section',
    title: 'Tailscale',
    children: [
      {
        id: 'ts-addr',
        type: 'item',
        title: 'Адреса',
        copy: { value: 'https://mac.tail1234.ts.net' },
      },
    ],
  },
  {
    id: 'webpw',
    type: 'section',
    title: 'Пароль Web UI',
    children: [
      {
        id: 'pw',
        type: 'item',
        title: 'Пароль',
        status: { label: 'Задано', tone: 'green' },
        comment: 'Пароль питають при вході через Tailscale. Щонайменше 12 символів.',
        actions: [
          {
            id: 'change-pw',
            label: 'Змінити',
            variant: 'default',
            action: { module: 'preview', name: 'set-password' },
            form: {
              fields: [{ name: 'password', label: 'Новий пароль', kind: 'password', required: true, minLength: 12 }],
            },
          },
        ],
      },
    ],
  },
  {
    id: 'kv',
    type: 'section',
    title: 'Remote KV Store',
    actions: [
      {
        id: 'kv-setup',
        label: 'Налаштувати',
        variant: 'default',
        action: { module: 'preview', name: 'kv-configure' },
        form: {
          title: 'Remote KV Store',
          fields: [
            {
              name: 'backend',
              label: 'Джерело',
              kind: 'select',
              value: 'redis',
              options: [
                { value: 'redis', label: 'Redis' },
                { value: 'upstash', label: 'Upstash' },
              ],
            },
            { name: 'url', label: 'URL', kind: 'url', placeholder: 'rediss://…' },
          ],
        },
      },
    ],
    children: [],
  },
  {
    id: 'bt-warn',
    type: 'notice',
    variant: 'warn',
    text: 'Без пароля або Apple Watch Mac може загубити пристрій поруч.',
  },
  {
    id: 'session-error',
    type: 'notice',
    variant: 'error',
    title: 'Сесія втрачає систему',
    text: 'Mac може заснути раніше, ніж закінчиться сесія.',
    dismiss: { module: 'preview', name: 'dismiss-error' },
  },
  { id: 'sep-or', type: 'separator', word: 'або' },
  {
    id: 'tabs-3',
    type: 'tabs',
    sticky: true,
    tabs: [
      { id: 'active', label: 'Активні · 1', children: [{ id: 'active-text', type: 'text', text: 'Одна активна сесія' }] },
      { id: 'inactive', label: 'Неактивні · 0', children: [] },
      { id: 'requests', label: 'Запити · 0', children: [] },
    ],
  },
  {
    id: 'tabs-7',
    type: 'tabs',
    tabs: [
      { id: 'telegram', label: 'Telegram', children: [] },
      { id: 'mac', label: 'Стан Mac', children: [] },
      { id: 'webui', label: 'Web UI', children: [] },
      { id: 'tailscale', label: 'Tailscale', children: [] },
      { id: 'sleeper', label: 'Sleeper', children: [] },
      { id: 'awake', label: 'Awake', children: [] },
      { id: 'agent', label: 'Агент', children: [] },
    ],
  },
];
