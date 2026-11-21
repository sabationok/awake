import type { BotNamespace } from './bot-options.types';

/** Що namespace бота вміє: його дії й екрани за іменами. Для каталогу в MaControl. */
export interface BotNamespaceCatalog {
  meta: BotNamespace;
  actions: string[];
  screens: string[];
}
