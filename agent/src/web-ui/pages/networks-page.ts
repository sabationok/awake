import type { SecretSource, UiNode, UiPage } from '@awake/contracts';
import { menuItem } from '../../modules/helpers/menu-item';
import { MAC_ONLY_HINT, WEB_UI_MODULE } from '../constants/web-ui';
import { webUiAction } from '../helpers/web-ui-action';
import type { WebUiRemoteStore, WebUiSnapshot } from '../types/web-ui-snapshot.types';

/** «Мережі»: довірені Wi-Fi (у них сервер відповідає не лише цьому Mac) і Upstash, через який стан бачить Vercel. */
export function buildNetworksPage(snapshot: WebUiSnapshot): UiPage {
  const { trustedNetworks, currentSsid } = snapshot;
  const networks: UiNode[] = [];
  if (currentSsid && !trustedNetworks.includes(currentSsid)) {
    networks.push({
      id: 'webui-network-current',
      type: 'item',
      title: currentSsid,
      icon: { symbol: 'wifi', tone: 'accent' },
      status: { label: 'Не довірена', tone: 'gray' },
      comment: 'Зараз тут',
      actions: [
        menuItem('webui-network-add', 'Додати', webUiAction('addNetwork', { ssid: currentSsid }), {
          variant: 'accent',
          scope: 'mac',
          hint: MAC_ONLY_HINT,
        }),
      ],
    });
  }
  trustedNetworks.forEach((ssid, index) => {
    networks.push({
      id: `webui-network-${index}`,
      type: 'item',
      title: ssid,
      icon: { symbol: 'checkmark.shield.fill', tone: 'green' },
      status: { label: 'Довірена', tone: 'green' },
      ...(ssid === currentSsid ? { comment: 'Зараз тут' } : {}),
      actions: [
        menuItem(`webui-network-remove-${index}`, 'Прибрати', webUiAction('removeNetwork', { ssid }), {
          variant: 'danger',
          scope: 'mac',
          hint: MAC_ONLY_HINT,
          confirm: {
            title: 'Прибрати мережу?',
            text: 'Поза довіреними мережами сервер відповідатиме лише цьому Mac.',
            ok: 'Прибрати',
          },
        }),
      ],
    });
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
      remoteStoreSection(snapshot.remoteStore),
    ],
  };
}

const SOURCE_LABEL: Record<Exclude<SecretSource, null>, string> = {
  env: 'з process.env',
  envify: 'з Envify',
  file: 'збережено на цьому Mac',
};

/**
 * Remote KV Store: куди сервер кладе живий стан для Web UI на Vercel. Бекенд поки один — Upstash REST (URL + токен),
 * тому вибору бекенда немає. Ключі задаються формою і пишуться сервером; значення в дерево не йдуть.
 */
function remoteStoreSection(store: WebUiRemoteStore): UiNode {
  const fromEnv = store.source === 'env' || store.source === 'envify';
  return {
    id: 'webui-remote-store',
    type: 'section',
    title: 'Remote KV Store',
    footer: 'Сюди сервер кладе живий стан для Web UI на Vercel. Історія і журнал лишаються на Mac.',
    children: [
      {
        id: 'webui-remote-store-upstash',
        type: 'item',
        title: 'Upstash',
        icon: { symbol: 'externaldrive.connected.to.line.below.fill', tone: 'indigo' },
        status: store.configured ? { label: 'Підключено', tone: 'green' } : { label: 'Не підключено', tone: 'gray' },
        ...(store.source ? { tags: [{ label: SOURCE_LABEL[store.source], tone: 'gray' as const }] } : {}),
        comment: fromEnv ? 'Ключі прийшли з конфігу; форма їх не перебиває.' : 'REST URL і токен з консолі Upstash.',
        actions: [
          menuItem('webui-remote-store-edit', store.configured ? 'Змінити' : 'Підключити', webUiAction('setRemoteStore', {}), {
            variant: store.configured ? 'default' : 'accent',
            scope: 'mac',
            hint: MAC_ONLY_HINT,
            disabled: fromEnv,
            form: {
              title: 'Upstash',
              submit: 'Зберегти',
              fields: [
                { name: 'url', label: 'REST URL', kind: 'url', placeholder: 'https://….upstash.io', required: true },
                { name: 'token', label: 'REST токен', kind: 'password', placeholder: store.configured ? 'задано, лишити' : 'токен з консолі Upstash' },
              ],
            },
          }),
        ],
      },
    ],
  };
}
