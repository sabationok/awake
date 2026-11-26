import type { MacPermission, PermissionsSnapshot, UiNode, UiPage } from '@awake/contracts';
import { MAC_PERMISSIONS, PERMISSIONS_MODULE, PERMISSION_INFO } from '../constants/permissions';

/** Модуль і системні дозволи, які він декларує. */
export interface ModulePermissions {
  id: string;
  title: string;
  permissions: MacPermission[];
}

const action = (name: string, params: Record<string, string | boolean>) => ({ module: PERMISSIONS_MODULE, name, params });

/**
 * «Дозволи»: два рівні. «Система» — що macOS видала серверу (правила sudoers); їх лише видно, а видати чи відкликати
 * можна тільки за самим Mac (кнопки зі scope mac: потрібне системне вікно пароля). «Модулі» — що з виданого лишено
 * кожному модулю; це перемикає власник з будь-якого свого клієнта.
 */
export function buildPermissionsPage(snapshot: PermissionsSnapshot, modules: ModulePermissions[], awakeActive: boolean): UiPage {
  const granted = (permission: MacPermission) => snapshot.granted.includes(permission);
  const denied = (module: string, permission: MacPermission) =>
    snapshot.denied.some((entry) => entry.module === module && entry.permission === permission);

  const system: UiNode[] = MAC_PERMISSIONS.flatMap((permission): UiNode[] => {
    const info = PERMISSION_INFO[permission];
    const isGranted = granted(permission);
    return [
      {
        id: `permissions-system-${permission}`,
        type: 'row',
        label: info.title,
        value: isGranted ? 'Видано' : 'Не видано',
        hint: info.purpose,
        icon: info.icon,
        dot: { tone: isGranted ? 'green' : 'gray' },
      },
      {
        id: `permissions-system-${permission}-actions`,
        type: 'buttons',
        scope: 'mac',
        buttons: [
          isGranted
            ? {
                id: `permissions-revoke-${permission}`,
                label: `Відкликати «${info.title}»…`,
                action: action('revoke', { permission }),
                variant: 'plain',
                // Сесія тримає сон вимкненим цим самим правилом.
                disabled: permission === 'sleepControl' && awakeActive,
              }
            : { id: `permissions-grant-${permission}`, label: `Надати «${info.title}»…`, action: action('grant', { permission }), variant: 'filled' },
        ],
      },
    ];
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
      ...moduleSections,
    ],
  };
}
