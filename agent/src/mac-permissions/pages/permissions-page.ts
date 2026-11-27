import type { MacPermission, PermissionsSnapshot, PrivacyAccess, PrivacyAccessKind, UiNode, UiPage, UiStatusBadge } from '@awake/contracts';
import { PRIVACY_ACCESS_KINDS } from '@awake/contracts';
import { menuItem } from '../../modules/helpers/menu-item';
import { MAC_PERMISSIONS, PERMISSIONS_MODULE, PERMISSION_INFO, PRIVACY_ACCESS_INFO } from '../constants/permissions';

/** Модуль і системні дозволи, які він декларує. */
export interface ModulePermissions {
  id: string;
  title: string;
  permissions: MacPermission[];
}

const action = (name: string, params: Record<string, string | boolean>) => ({ module: PERMISSIONS_MODULE, name, params });
const onlyMac = { scope: 'mac' as const, hint: 'Змінити можна лише в аппці на Mac' };

const ACCESS_STATUS: Record<PrivacyAccess, UiStatusBadge> = {
  granted: { label: 'Видано', tone: 'green' },
  denied: { label: 'Заборонено', tone: 'red' },
  restricted: { label: 'Обмежено', tone: 'orange' },
  notDetermined: { label: 'Не запитано', tone: 'gray' },
};

/**
 * Дозволи macOS помічника. Запит іде лише з кнопки: «Надати…», поки не запитано; «Відкрити налаштування…» після
 * відмови (macOS удруге вікна не покаже). Видано — кнопки немає: відкликають у системних налаштуваннях.
 */
function privacyNode(kind: PrivacyAccessKind, access: PrivacyAccess | null): UiNode {
  const info = PRIVACY_ACCESS_INFO[kind];
  const request = action('requestAccess', { access: kind });
  const actions =
    access === 'notDetermined'
      ? [menuItem(`permissions-access-${kind}-request`, 'Надати…', request, { ...onlyMac, variant: 'accent' })]
      : access === 'denied' || access === 'restricted'
        ? [menuItem(`permissions-access-${kind}-settings`, 'Відкрити налаштування…', request, onlyMac)]
        : [];
  return {
    id: `permissions-access-${kind}`,
    type: 'item',
    title: info.title,
    icon: info.icon,
    status: access ? ACCESS_STATUS[access] : { label: 'Невідомо', tone: 'gray' },
    comment: info.purpose,
    actions,
  };
}

/**
 * «Дозволи». «Система» — що macOS видала серверу (правила sudoers); їх лише видно, а видати чи відкликати
 * можна тільки за самим Mac (кнопки зі scope mac: потрібне системне вікно пароля). «Приватність macOS» — геолокація і
 * Bluetooth помічника, з тим самим правилом: стан видно всюди, запит — лише кнопкою в аппці на Mac. Модульні секції —
 * що з виданого лишено кожному модулю; це перемикає власник з будь-якого свого клієнта.
 */
export function buildPermissionsPage(
  snapshot: PermissionsSnapshot,
  access: Record<PrivacyAccessKind, PrivacyAccess> | null,
  modules: ModulePermissions[],
  awakeActive: boolean,
): UiPage {
  const granted = (permission: MacPermission) => snapshot.granted.includes(permission);
  const denied = (module: string, permission: MacPermission) =>
    snapshot.denied.some((entry) => entry.module === module && entry.permission === permission);

  const system: UiNode[] = MAC_PERMISSIONS.map((permission): UiNode => {
    const info = PERMISSION_INFO[permission];
    const isGranted = granted(permission);
    return {
      id: `permissions-system-${permission}`,
      type: 'item',
      title: info.title,
      icon: info.icon,
      status: isGranted ? { label: 'Видано', tone: 'green' } : { label: 'Немає', tone: 'gray' },
      comment: info.purpose,
      actions: [
        isGranted
          ? menuItem(`permissions-revoke-${permission}`, 'Відкликати', action('revoke', { permission }), {
              ...onlyMac,
              variant: 'danger',
              confirm: {
                title: `Відкликати «${info.title}»?`,
                text: 'Модулі, яким він потрібен, перестануть це робити. macOS попросить пароль.',
                ok: 'Відкликати',
              },
              // Сесія тримає сон вимкненим цим самим правилом.
              disabled: permission === 'sleepControl' && awakeActive,
            })
          : menuItem(`permissions-grant-${permission}`, 'Запит', action('grant', { permission }), { ...onlyMac, variant: 'accent' }),
      ],
    };
  });

  const moduleSections: UiNode[] = modules
    .filter((module) => module.permissions.length > 0)
    .map((module) => ({
      id: `permissions-module-${module.id}`,
      type: 'section',
      title: module.title,
      children: module.permissions.map((permission): UiNode => {
        const info = PERMISSION_INFO[permission];
        const params = { module: module.id, permission };
        return {
          id: `permissions-module-${module.id}-${permission}`,
          type: 'row',
          label: info.title,
          hint: granted(permission) ? info.purpose : `${info.purpose} Не діє, поки не видано в системі.`,
          icon: info.icon,
          control: {
            type: 'switch',
            value: !denied(module.id, permission),
            on: action('setModule', { ...params, allowed: true }),
            off: action('setModule', { ...params, allowed: false }),
          },
        };
      }),
    }));

  return {
    id: PERMISSIONS_MODULE,
    module: PERMISSIONS_MODULE,
    title: 'Дозволи',
    icon: { symbol: 'lock.fill', tone: 'accent' },
    group: 'system',
    // Дозволи — справа адміна: через Vercel не віддаємо.
    scope: 'local',
    children: [
      {
        id: 'permissions-system',
        type: 'section',
        title: 'Система',
        footer:
          'Окремі правила sudoers із фіксованими командами без пароля. Видати чи відкликати можна лише за самим Mac: macOS попросить пароль. Модулі не можуть отримати більше, ніж видано тут.',
        children: system,
      },
      {
        id: 'permissions-privacy',
        type: 'section',
        title: 'Приватність macOS',
        footer:
          'Дозволи macOS для MaControl Helper. Системне вікно з\'являється лише після «Надати…» в аппці на Mac; сам MaControl їх не питає.',
        children: PRIVACY_ACCESS_KINDS.map((kind) => privacyNode(kind, access?.[kind] ?? null)),
      },
      ...moduleSections,
    ],
  };
}
