import { getUiTree } from '@/server/ui-actions';
import type { UiSource } from './ui-source';

/** Vercel: дерево з Upstash через серверний екшен, без дій; без сесії — на вхід. */
export const remoteSource: UiSource = {
  async load() {
    const { tree, authorized } = await getUiTree();
    if (!authorized) {
      location.assign('/login');
      return null;
    }
    return tree;
  },
};
