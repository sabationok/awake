import type { UiNode, UiPage } from '@awake/contracts';
import { WEB_UI_MODULE } from '../constants/web-ui';
import { formatWhen } from '../helpers/format-when';
import { webUiAction } from '../helpers/web-ui-action';
import type { WebUiSnapshot } from '../types/web-ui-snapshot.types';

const VIA_LABEL: Record<string, string> = { local: 'довірена Wi-Fi', tailnet: 'Tailscale', remote: 'Vercel' };

/** «Пристрої»: сполучені браузери. Сполучити новий і відкликати можна лише з Mac: пристрій не керує іншими. */
export function buildDevicesPage(snapshot: WebUiSnapshot): UiPage {
  const devices: UiNode[] = snapshot.devices.flatMap((device): UiNode[] => [
    {
      id: `webui-device-${device.id}`,
      type: 'row',
      label: device.name,
      value: VIA_LABEL[device.via] ?? device.via,
      hint: `Сполучено ${formatWhen(device.createdAt)} · ${device.lastSeenAt ? `заходив ${formatWhen(device.lastSeenAt)}` : 'ще не заходив'}`,
      icon: { symbol: 'laptopcomputer.and.iphone', tone: 'gray' },
    },
    {
      id: `webui-device-${device.id}-actions`,
      type: 'buttons',
      scope: 'mac',
      buttons: [
        {
          id: `webui-device-revoke-${device.id}`,
          label: `Відкликати «${device.name}»`,
          variant: 'destructive',
          confirm: 'Пристрій одразу втратить доступ до Web UI. Щоб повернути, його доведеться сполучити знову.',
          action: webUiAction('revokeDevice', { id: device.id }),
        },
      ],
    },
  ]);
  if (!devices.length) devices.push({ id: 'webui-devices-empty', type: 'text', text: 'Ще жоден пристрій не сполучений.', tone: 'gray' });
  const pairing: UiNode[] = [
    {
      id: 'webui-pairing-state',
      type: 'row',
      label: 'Запити на сполучення',
      value: snapshot.pendingRequests ? `чекає: ${snapshot.pendingRequests}` : 'немає',
      hint: 'QR, посилання з кодом і відповідь на запит — лише в аппці на Mac.',
      icon: { symbol: 'qrcode', tone: 'accent' },
      dot: { tone: snapshot.pendingRequests ? 'orange' : 'gray' },
    },
  ];
  return {
    id: 'webui-devices',
    module: WEB_UI_MODULE,
    title: 'Пристрої',
    icon: { symbol: 'laptopcomputer.and.iphone', tone: 'gray' },
    group: 'modules',
    scope: 'local',
    children: [
      { id: 'webui-pairing', type: 'section', title: 'Сполучити новий', children: pairing },
      { id: 'webui-devices-list', type: 'section', title: 'Сполучені пристрої', children: devices },
    ],
  };
}
