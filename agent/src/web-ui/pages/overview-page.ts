import type { UiNode, UiPage } from '@awake/contracts';
import { WEB_UI_ICON, WEB_UI_MODULE } from '../constants/web-ui';
import { formatWhen } from '../helpers/format-when';
import type { WebUiSnapshot } from '../types/web-ui-snapshot.types';

const SOURCE_LABEL = { published: 'Опублікована окремо', bundle: 'З аппки' } as const;

/** Головна сторінка модуля: за якими адресами відкривається Web UI і яку його збірку віддає сервер. */
export function buildOverviewPage(snapshot: WebUiSnapshot): UiPage {
  const addresses: UiNode[] = snapshot.addresses.map((address) => ({
    id: `webui-address-${address.id}`,
    type: 'row',
    label: address.label,
    value: address.url ?? 'Недоступно',
    hint: address.note,
    icon: { symbol: address.symbol, tone: 'accent' },
    dot: { tone: address.url ? 'green' : 'gray' },
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
      {
        id: 'webui-addresses',
        type: 'section',
        title: 'Адреси',
        footer: 'У локальній мережі сервер відповідає лише в довіреній Wi-Fi. Список мереж — на сторінці «Мережі».',
        children: addresses,
      },
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
