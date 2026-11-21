# Relay через webhooxy: контракт

Дашборд (браузер) і агент на Mac тримають WSS до двосторонньої room у webhooxy. Агент виступає як `host`, браузери як `viewer`. Контракт погоджено з сесією webhooxy 2026-11-21.

- **Namespace:** socket.io `/relay`. Прод: `https://webhooks-proxy-dev.up.railway.app/relay`, локально: `http://localhost:3106/relay`. REST: `<base>/api`.
- **host (агент):** `io(URL + '/relay', { auth: { token, destId }, query: { mt_workspace } })`.
  - `token` — JWT, підписаний `credentials.privateKey` воркспейсу.
  - Room сервер бере з `config.transports.ws.roomId` DEST-шару `destId`.
  - Нове підключення host витісняє старе.
- **viewer (браузер):** `auth: { ticket }`. Room і роль зашиті в квиток.
- **Ack усюди:** `{ status: 'ok', data? } | { status: 'error', code: 'HOST_OFFLINE' | 'TIMEOUT' | 'UNAUTHORIZED' | 'BAD_REQUEST', message? }`.
- **viewer → host:**
  1. viewer шле `relay:send { payload }` з ack;
  2. host отримує `relay:message { from: <viewerSocketId>, payload }` з ack;
  3. `data` з ack host-а повертається viewer-у.

  Таймаут за замовчуванням 10 с. Ping іде цим самим каналом.
- **host → viewers:** host шле `relay:broadcast { payload }`, кожен viewer отримує `relay:message { from: 'host', payload }`.
- **Присутність:** `relay:peer { host: 'online' | 'offline' }` приходить одразу після connect і при кожній зміні. Коли один host витісняє іншого, `offline` не надсилається.
- **Квитки:** `POST /api/relay/tickets/create`, тіло `{ room, role: 'viewer', ttlSec? }` (за замовчуванням 60, максимум ~300) → `{ data: { ticket, expiresAt, wsUrl }, statusCode }`.
  - Квиток одноразовий.
  - Ключ для видачі вміє тільки видавати квитки viewer для rooms свого воркспейсу. У webhooxy зберігається лише його хеш, сам ключ лежить в Envify як `WEBHOOXY_TICKET_KEY`.
  - SDK: `RelaySdk.issueTicket({ room, role, ttlSec })`.
- **Payload:** webhooxy його не розбирає, формат визначає MaControl:
  - `{ type: 'action', action }` — від viewer;
  - `{ type: 'ping' }` — від viewer;
  - `{ type: 'tree', tree }` — від host;
  - `{ type: 'state', … }` — від host.
- **Локальний тест:** seed-скрипт relay-сесії створює workspace, DEST з roomId, host-токен і ключ квитків.
