import type { UiNode, UiPage } from '@awake/contracts';
import type { BotNamespaceCatalog } from '../../../bot';

/** Імена через кому; головний екран ('') — «меню». */
function names(list: string[]): string {
  return list.length ? list.map((name) => name || 'меню').join(', ') : '—';
}

function namespaceSection(entry: BotNamespaceCatalog): UiNode {
  const { meta } = entry;
  return {
    id: `ns-${meta.namespace}`,
    type: 'section',
    title: meta.namespace,
    footer: meta.description,
    children: [
      { id: `ns-${meta.namespace}-command`, type: 'row', label: 'Команда', value: meta.command ? `/${meta.command}` : 'немає' },
      { id: `ns-${meta.namespace}-actions`, type: 'row', label: 'Дії', hint: names(entry.actions), value: String(entry.actions.length) },
      { id: `ns-${meta.namespace}-screens`, type: 'row', label: 'Екрани', hint: names(entry.screens), value: String(entry.screens.length) },
    ],
  };
}

/** «Команди»: що вміє бот — namespace-и з `@Bot`, їхні дії й екрани. Що з цього приймає Telegram, вирішує сторінка Telegram. */
export function buildBotCatalogPage(catalog: BotNamespaceCatalog[]): UiPage {
  return {
    id: 'bot-catalog',
    module: 'bot',
    title: 'Команди',
    icon: { symbol: 'command', tone: 'accent' },
    group: 'modules',
    children: catalog.map(namespaceSection),
  };
}
