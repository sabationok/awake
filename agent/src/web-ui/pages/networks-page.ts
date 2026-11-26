import type { UiNode, UiPage } from '@awake/contracts';
import { MAC_ONLY_HINT, WEB_UI_MODULE } from '../constants/web-ui';
import { webUiAction } from '../helpers/web-ui-action';
import type { WebUiSnapshot } from '../types/web-ui-snapshot.types';

/** «Мережі»: довірені Wi-Fi (у них сервер відповідає не лише цьому Mac) і Upstash, через який стан бачить Vercel. */
export function buildNetworksPage(snapshot: WebUiSnapshot): UiPage {
  const { trustedNetworks, currentSsid } = snapshot;
  const networks: UiNode[] = [];
  if (currentSsid && !trustedNetworks.includes(currentSsid)) {
    networks.push(
      { id: 'webui-network-current', type: 'row', label: currentSsid, value: 'зараз тут · не довірена', icon: { symbol: 'wifi', tone: 'accent' } },
      {
        id: 'webui-network-current-actions',
        type: 'buttons',
        scope: 'mac',
        buttons: [{ id: 'webui-network-add', label: `Додати «${currentSsid}»`, variant: 'filled', action: webUiAction('addNetwork', { ssid: currentSsid }) }],
      },
    );
  }
  trustedNetworks.forEach((ssid, index) => {
    networks.push(
      {
        id: `webui-network-${index}`,
        type: 'row',
        label: ssid,
        value: ssid === currentSsid ? 'зараз тут' : undefined,
        icon: { symbol: 'checkmark.shield.fill', tone: 'green' },
      },
      {
        id: `webui-network-${index}-actions`,
        type: 'buttons',
        scope: 'mac',
        buttons: [{ id: `webui-network-remove-${index}`, label: `Прибрати «${ssid}»`, variant: 'plain', action: webUiAction('removeNetwork', { ssid }) }],
      },
    );
  });
  if (!networks.length) networks.push({ id: 'webui-networks-empty', type: 'text', text: 'Довірених мереж немає.', tone: 'gray' });
  return {
    id: 'webui-networks',
    module: WEB_UI_MODULE,
    title: 'Мережі',
    icon: { symbol: 'wifi', tone: 'accent' },
    group: 'modules',
    scope: 'local',
    children: [
      {
        id: 'webui-trusted',
        type: 'section',
        title: 'Довірені мережі Wi-Fi',
        footer: `Поза довіреними мережами сервер відповідає тільки цьому Mac. ${MAC_ONLY_HINT}`,
        children: networks,
      },
      {
        id: 'webui-upstash',
        type: 'section',
        title: 'Upstash',
        footer: 'Сюди сервер кладе живий стан для Web UI на Vercel. Історія і журнал лишаються на Mac.',
        children: [
          {
            id: 'webui-upstash-state',
            type: 'row',
            label: 'Ключі',
            value: snapshot.upstashConfigured ? 'Підключено' : 'Не підключено',
            hint: MAC_ONLY_HINT,
            icon: { symbol: 'externaldrive.connected.to.line.below.fill', tone: 'indigo' },
            dot: { tone: snapshot.upstashConfigured ? 'green' : 'gray' },
          },
        ],
      },
    ],
  };
}
