import type { UiList } from '@awake/contracts';
import { formatSessionStart } from '../../modules/helpers/format-session-start';
import type { RelayViewerSession } from '../types/relay-status.types';

/** Рядок сесії viewer-а: коли пустили, хто, звідки і чи через проксі webhooxy. */
export function relaySessionListItem(session: RelayViewerSession): UiList['items'][number] {
  return {
    id: session.viewerId,
    label: formatSessionStart(session.authorizedAt),
    hint: [session.sub, session.origin, session.proxy !== null ? `проксі ${session.proxy || 'webhooxy'}` : null]
      .filter((part): part is string => !!part)
      .join(' · '),
    value: session.proxy !== null ? 'proxy' : 'relay',
  };
}
