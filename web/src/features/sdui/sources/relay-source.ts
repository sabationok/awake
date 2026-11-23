import { io, type Socket } from 'socket.io-client';
import type { RelayHostBroadcast, RelayHostReply, RelayViewerAccess, RelayViewerMessage, UiEvent, UiTree } from '@awake/contracts';
import { callAgent } from '@/features/pairing/agent-api';
import { getRelayAccess } from '@/server/relay-actions';

/**
 * Стан viewer-а relay: off — relay не налаштований або немає сесії; connecting → pending (чекає агента) → online;
 * host-offline — агент не в кімнаті; denied — агент або webhooxy не пустили.
 */
export type RelayStatus = 'off' | 'connecting' | 'pending' | 'online' | 'host-offline' | 'denied';

export interface RelaySnapshot {
  status: RelayStatus;
  tree: UiTree | null;
  reason: string | null;
}

interface ServerEnvelope<T> {
  statusCode: number;
  message: string;
  data: T;
  meta?: { from?: string };
}

/**
 * Квиток на сокет: із сесією Web UI його підписує Vercel, а сполученому пристрою — сам Mac
 * через проксі (`/api/mac/connect` з HttpOnly-кукі `mc_device`). null — ні того, ні іншого.
 */
async function getViewerAccess(): Promise<RelayViewerAccess | null> {
  const session = await getRelayAccess().catch(() => null);
  if (session) return session;
  return callAgent<RelayViewerAccess>('/api/mac/connect', null, { method: 'POST', body: '{}' }).catch(() => null);
}

/** Відмови handshake, після яких варто почекати, а не стукати знову одразу. */
const BACKOFF_MS = 30_000;
const RETRY_MS = 5_000;

/**
 * Одне з'єднання viewer-а з relay webhooxy (docs/relay-contract.md). `auth` — функція:
 * кожне (пере)підключення бере новий одноразовий квиток з server action.
 */
export function createRelayConnection(onChange: (snapshot: RelaySnapshot) => void) {
  let snapshot: RelaySnapshot = { status: 'connecting', tree: null, reason: null };
  let socket: Socket | null = null;
  let retry: ReturnType<typeof setTimeout> | undefined;
  let closed = false;

  const update = (patch: Partial<RelaySnapshot>) => {
    snapshot = { ...snapshot, ...patch };
    onChange(snapshot);
  };

  const request = async (data: RelayViewerMessage): Promise<RelayHostReply> => {
    if (!socket) throw new Error('Relay не підключений');
    const reply = (await socket.timeout(15_000).emitWithAck('relay:send', { data })) as ServerEnvelope<RelayHostReply | null>;
    if (reply.statusCode !== 200 || !reply.data) throw new Error(`Relay: ${reply.message}`);
    if (reply.data.type === 'error') throw new Error(reply.data.message);
    return reply.data;
  };

  const loadTree = async () => {
    const reply = await request({ type: 'tree' });
    if (reply.type === 'tree') update({ tree: reply.tree });
  };

  const scheduleReconnect = (ms: number) => {
    clearTimeout(retry);
    retry = setTimeout(() => !closed && socket?.connect(), ms);
  };

  const start = async () => {
    const first = await getViewerAccess();
    if (closed) return;
    if (!first) return update({ status: 'off' });
    let pendingAccess: typeof first | null = first;
    socket = io(`${first.url}/relay`, {
      transports: ['websocket'],
      auth: (cb) => {
        const use = (access: typeof first | null) =>
          cb(access ? { token: access.token, room: access.room, mt_workspace: access.workspace } : {});
        // Перший квиток уже є; далі кожне підключення бере свіжий.
        if (pendingAccess) {
          use(pendingAccess);
          pendingAccess = null;
        } else void getViewerAccess().then(use, () => use(null));
      },
    });

    socket.on('connect', () => update({ status: 'pending', reason: null }));
    socket.on('relay:peer', (envelope: ServerEnvelope<{ host: 'online' | 'offline' }>) => {
      if (envelope.data.host === 'offline') update({ status: 'host-offline' });
      else if (snapshot.status === 'host-offline') update({ status: 'pending' });
    });
    socket.on('relay:authorized', () => {
      update({ status: 'online', reason: null });
      void loadTree().catch((error: Error) => update({ reason: error.message }));
    });
    socket.on('relay:denied', (envelope: ServerEnvelope<null>) => update({ status: 'denied', reason: envelope.message }));
    socket.on('relay:message', (envelope: ServerEnvelope<RelayHostBroadcast>) => {
      if (envelope.meta?.from === 'host' && envelope.data?.type === 'tree') update({ tree: envelope.data.tree });
    });
    socket.on('connect_error', (error) => {
      if (socket?.active) return update({ status: 'connecting', reason: error.message });
      // Middleware webhooxy відмовив: socket.io сам не повторює.
      update({ status: 'denied', reason: error.message });
      scheduleReconnect(error.message === 'UNAUTHORIZED' ? RETRY_MS : BACKOFF_MS);
    });
    socket.on('disconnect', (reason) => {
      if (closed) return;
      if (snapshot.status !== 'denied') update({ status: 'connecting', reason });
      // Після relay:denied чи kick сервер рве з'єднання сам; пробуємо пізніше з новим квитком.
      if (reason === 'io server disconnect') scheduleReconnect(BACKOFF_MS);
    });
  };

  void start();

  return {
    async send(event: UiEvent) {
      await request({ type: 'event', event });
    },
    close() {
      closed = true;
      clearTimeout(retry);
      socket?.removeAllListeners();
      socket?.disconnect();
    },
  };
}
