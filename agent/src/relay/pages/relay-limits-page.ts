import type { UiNode, UiPage } from '@awake/contracts';
import type { ModuleContext } from '../../modules/types/mac-module';
import { RELAY_LIMIT_KEYS, RELAY_LIMITS_PAGE } from '../constants/relay-settings';
import { effectiveLimit } from '../helpers/effective-limit';
import type { RelayStateSnapshot } from '../types/relay-status.types';

/** Select ліміту з тим, що реально діє у webhooxy, у підказці. */
function limitNode(ctx: ModuleContext, key: string, state: RelayStateSnapshot): UiNode {
  const node = ctx.settingNode(key);
  const effective = effectiveLimit(state.limits.effective, key);
  return effective === null ? node : ({ ...node, hint: `Діє: ${effective}` } as UiNode);
}

/** «Ліміти»: перевизначення лімітів кімнати webhooxy і те, що з них діє. */
export function buildRelayLimitsPage(ctx: ModuleContext, state: RelayStateSnapshot): UiPage {
  const { limits } = state;
  return {
    id: RELAY_LIMITS_PAGE,
    module: 'relay',
    title: 'Ліміти',
    icon: { symbol: 'slider.horizontal.3', tone: 'accent' },
    group: 'modules',
    // Webhooxy налаштовують лише в SwiftUI: Web UI, що йде через нього, сам його не крутить.
    scope: 'mac',
    children: [
      {
        id: 'limits',
        type: 'section',
        title: 'Ліміти кімнати',
        footer: limits.error
          ? `webhooxy не прийняв останні ліміти (${limits.error}); діють попередні.`
          : 'Діють одразу, без перепідключення. «Як у webhooxy» — поле не передається.',
        children: RELAY_LIMIT_KEYS.map((key) => limitNode(ctx, key, state)),
      },
    ],
  };
}
