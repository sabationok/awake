import { getUiTree } from '@/server/ui-actions';
import { STEP_PATH } from '@/features/redirects/redirect-flows';
import type { UiSource } from './ui-source';

/** Vercel: дерево з Upstash через серверний екшен, без дій; без сесії й без кукі пристрою — на вхід. */
export const remoteSource: UiSource = {
  async load() {
    const { tree, authorized, device } = await getUiTree();
    // Сполучений пристрій без пароля: лише relay, вхід не потрібен.
    if (!authorized && device) return null;
    if (!authorized) {
      location.assign(STEP_PATH.login);
      return null;
    }
    return tree;
  },
};
