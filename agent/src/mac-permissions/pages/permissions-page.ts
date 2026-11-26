import type { MacPermission, PermissionsSnapshot, UiNode, UiPage } from '@awake/contracts';
import { menuItem } from '../../modules/helpers/menu-item';
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

  const system: UiNode[] = MAC_PERMISSIONS.map((permission): UiNode => {
    const info = PERMISSION_INFO[permission];
    const isGranted = granted(permission);
    const onlyMac = { scope: 'mac' as const, hint: 'Змінити можна лише в аппці на Mac' };
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
      ...moduleSections,
    ],
  };
}
