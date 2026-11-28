import type { UiNode, UiOption, UiRow } from '@macontrol/contracts';
import type { ModuleContext } from '../types/mac-module';

/** Рядок вибору всередині вкладки: ключ налаштування модуля, підпис і варіанти. */
export interface PlanTabField {
  key: string;
  label: string;
  options: UiOption[];
}

/**
 * Вкладки «Період» | «Час» сесії модуля (Awake, таймер сну). Вкладка пише `<module>.mode`,
 * від неї залежить, що запустить «Старт»: тривалість чи час доби.
 */
export function planTabsNode(ctx: ModuleContext, module: string, period: PlanTabField, time: PlanTabField): UiNode {
  const row = (field: PlanTabField): UiRow => ({
    id: `plan-${field.key}`,
    type: 'row',
    label: field.label,
    control: { type: 'select', value: ctx.setting<string>(field.key), options: field.options, setting: { module, key: field.key } },
  });
  return {
    id: 'plan',
    type: 'tabs',
    value: ctx.setting<string>('mode'),
    setting: { module, key: 'mode' },
    tabs: [
      { id: 'period', label: 'Період', children: [row(period)] },
      { id: 'time', label: 'Час', children: [row(time)] },
    ],
  };
}
