import type { UiNode, UiPage } from '@macontrol/contracts';
import { WEB_UI_ICON, WEB_UI_MODULE } from '../constants/web-ui';
import { formatWhen } from '../helpers/format-when';
import type { WebUiSnapshot } from '../types/web-ui-snapshot.types';

const SOURCE_LABEL = { published: 'Опублікована окремо', bundle: 'З аппки' } as const;

/** Адреси за каналом, як фільтр на «Пристроях»: Local, Priv, Proxy. */
const ADDRESS_SECTIONS = [
  {
    id: 'local',
    title: 'Local',
    ids: ['mac', 'lan'],
    footer: 'У локальній мережі сервер відповідає лише в довіреній Wi-Fi. Список мереж — на сторінці «Мережі».',
  },
  // Назву каналу й опис уже несе картка Tailscale: заголовок і футер секції їх не повторюють.
  { id: 'priv', title: 'Priv', ids: ['tailnet'] },
  { id: 'proxy', title: 'Proxy · Vercel', ids: ['vercel'], footer: 'Перегляд стану з будь-якої мережі; керування — через канали вище.' },
];

/** Головна сторінка модуля: за якими адресами відкривається Web UI і яку його збірку віддає сервер. */
/** `heartbeat` — перемикач «Пульс для Vercel» (налаштування модуля): стоїть у секції Vercel, бо пульс лише для неї. */
export function buildOverviewPage(snapshot: WebUiSnapshot, heartbeat: UiNode): UiPage {
  // Адреса — лише для читання: URL іде в copy (кнопка «Копіювати»), на статусі — Працює / Недоступно.
  const addresses: UiNode[] = snapshot.addresses.map((address): UiNode => ({
    id: `webui-address-${address.id}`,
    type: 'item',
    title: address.label,
    icon: { symbol: address.symbol, tone: 'accent' },
    status: address.url ? { label: 'Працює', tone: 'green' } : { label: 'Недоступно', tone: 'gray' },
    ...(address.url ? { copy: { value: address.url } } : {}),
    ...(address.note ? { comment: address.note } : {}),
  }));
  const { web } = snapshot;
  return {
    id: WEB_UI_MODULE,
    module: WEB_UI_MODULE,
    title: 'Web UI',
    icon: WEB_UI_ICON,
    group: 'modules',
    // Адреси, сесії й пристрої — справа адміна: через Vercel не віддаємо.
    scope: 'local',
    children: [
      ...ADDRESS_SECTIONS.map((section): UiNode => ({
        id: `webui-addresses-${section.id}`,
        type: 'section',
        title: section.title,
        footer: section.footer,
        children: [
          ...addresses.filter((node) => section.ids.some((id) => node.id === `webui-address-${id}`)),
          ...(section.id === 'proxy' ? [heartbeat] : []),
        ],
      })).filter((node) => node.type === 'section' && node.children.length > 0),
      {
        id: 'webui-build',
        type: 'section',
        title: 'Збірка',
        footer: 'Нову збірку публікує scripts/publish-web-local.sh: сервер віддає її одразу. Без публікації — збірка з аппки.',
        children: [
          {
            id: 'webui-build-source',
            type: 'row',
            label: 'Звідки',
            value: web.source ? SOURCE_LABEL[web.source] : 'Збірки немає',
            hint: web.builtAt ? `Зібрано ${formatWhen(web.builtAt)}` : undefined,
            icon: { symbol: 'shippingbox.fill', tone: 'indigo' },
          },
        ],
      },
    ],
  };
}
