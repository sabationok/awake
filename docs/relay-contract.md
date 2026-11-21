# Relay через webhooxy: контракт

Дашборд (браузер) і агент на Mac тримають WSS до двосторонньої room у webhooxy. Агент виступає як `host`, браузери як `viewer`. webhooxy лише пересилає повідомлення: ключів relay він не зберігає й токенів viewer-а не перевіряє. Пускати viewer-а чи ні, вирішує сам host, тобто агент.

Модель погоджено з webhooxy 2026-11-21. Вона замінила попередні варіанти (REST-квитки, спільний JWT-ключ, ES256-ключі воркспейсу в `credentials`, reveal). Форми подій остаточні, за PR #5 (`feat/ws-relay` → `dev`, head `bfbe742`, ще не змерджений).

## Середовища

Поки є тільки dev, і середовища не змішуються: MaControl dev UI (Vercel, гілка `dev`) → webhooxy API dev (`webhooks-proxy-dev.up.railway.app`) → агент на Mac. Кожен сервіс знає свій stage (агент `MACONTROL_STAGE`, дашборд `STAGE`, за замовчуванням `dev`) і бере URL webhooxy того самого stage з мапи в конфігу (`agent/src/config/agent-config.ts`, `web/src/server/stage-config.ts`); `WEBHOOXY_URL` лише перекриває його. Ключ `WEBHOOXY_JWT_TICKET_KEY` — з dev-середовища Envify. Прод (`main` ↔ production) з'явиться окремо.

## Підключення

- **Namespace:** socket.io `/relay` (path `/socket.io`, хост API).
  - Прод: `https://webhooks-proxy-dev.up.railway.app/relay`.
  - Локально: `http://localhost:3106/relay`.
- **host (агент):** підключається як звичайний WS-отримувач вебхуків, `io(URL + '/relay', { auth: { token, destId }, query: { mt_workspace } })`.
  - `token` — токен воркспейсу webhooxy.
  - Room береться з `transports.ws.roomId` DEST-а `destId`.
  - Новий host витісняє старого. Витіснений отримує disconnect з reason `'io server disconnect'` і не повинен перепідключатися в циклі.
- **viewer (браузер):** `io(URL + '/relay', { auth: { token, room }, query: { mt_workspace } })`. `mt_workspace` можна передати і в `auth`.
  - Для webhooxy `token` непрозорий: формат і перевірку визначає MaControl (див. «Токен viewer-а»).
  - `auth` варто передавати функцією, щоб кожне (пере)підключення брало свіжий токен.
- **Помилка handshake:** `connect_error`. Коди йдуть у порядку перевірки:
  1. `'RATE_LIMITED'` — спрацювала глобальна стеля;
  2. `'UNAUTHORIZED'` — token, workspace, room, DEST або origin;
  3. `'RATE_LIMITED'` — спрацювали ліміти DEST;
  4. `'ROOM_FULL'`.

  На `RATE_LIMITED` і `ROOM_FULL` клієнт робить backoff, на `UNAUTHORIZED` бере новий токен. Ліміти описано в розділі «Ліміти relay».

## Авторизація viewer-а агентом

1. Після connect viewer у стані pending. Він одразу отримує `relay:peer`, а `relay:send` повертає `401 PENDING`. Broadcast-и pending-viewer-ам не надходять.
2. host отримує `relay:authorize { data: { viewerId, token, headers: { origin, user-agent } } }` з ack і протягом 5 с відповідає `{ data: { allow, sub? } }`.
3. Результат:
   - allow → viewer отримує `relay:authorized { data: { sub | null } }`;
   - інакше viewer отримує `relay:denied`, і з'єднання розривається. Коди:
     - `403 DENIED` — host відмовив;
     - `403 KICKED` — host вигнав;
     - `504 TIMEOUT` — host не відповів за 5 с;
     - `503 HOST_OFFLINE` — host не з'явився за 60 с.
4. Якщо host офлайн, viewer чекає в pending до 60 с. Коли host підключиться, усіх pending відправлять йому на `relay:authorize`.
5. Коли новий host витісняє старого, вже авторизованих viewer-ів повторно не перевіряють.
6. host може вигнати viewer-а через `relay:kick { data: { viewerId } }`. Ack: `{ 200 }` або `404 NOT_FOUND`.

## Токен viewer-а (наш формат)

- Server action на Vercel підписує його після перевірки сесії дашборду. Агент перевіряє його в `relay:authorize`.
- Ключ — `WEBHOOXY_JWT_TICKET_KEY`: він для квитків на webhooxy-relay, тому має префікс сервісу, а не `MACONTROL_`. Ключ спільний для Vercel і агента й лежить в Envify проєкту MaControl. Сам webhooxy його не знає і токен не перевіряє.
- Формат: JWT HS256, claims:
  - `aud: 'macontrol-agent'`;
  - `sub` — id користувача дашборду;
  - `room`;
  - `iat`, `exp` (≤ iat + 300);
  - одноразовий `jti`.
- Агент перевіряє підпис, `aud`, `exp`, `room` і невикористаний `jti`. Тоді `allow`, а `sub` береться з токена.
- Додатково агент може звіряти `headers.origin` зі списком дашбордів (`MACONTROL_DASHBOARD_ORIGINS`).

## Конверт і події (як у mia-erp-server)

- Від клієнта: `{ data, query?, headers? }`.
- Від сервера: `{ statusCode, message, data, meta? }`, відправник у `meta.from`.
- Помилки в ack: `{ statusCode, message, data: null }`:
  - `400 'BAD_REQUEST'`;
  - `401 'UNAUTHORIZED' | 'PENDING'`;
  - `503 'HOST_OFFLINE'`;
  - `504 'TIMEOUT'`.
- **viewer → host:**
  1. viewer шле `relay:send { data }` з ack;
  2. host отримує `relay:message { 200, data, meta: { from: viewerId } }` і відповідає ack-ом `{ data }`;
  3. viewer отримує ack:
     - `{ 200, data: <data з ack host-а> }`;
     - або `401 PENDING`, `503 HOST_OFFLINE`, `504 TIMEOUT` (`sendTimeoutMs`), `400 BAD_REQUEST`, `413 PAYLOAD_TOO_LARGE`, `429 TOO_MANY_REQUESTS`.

  Ping іде цим самим каналом.
- **host → viewers:** host шле `relay:broadcast { data }`, у разі помилки ack повертає `413` або `429`. Кожен авторизований viewer отримує `relay:message { 200, data, meta: { from: 'host' } }`.
- **Присутність:** `relay:peer { 200, 'Success', data: { host: 'online' | 'offline' } }` приходить одразу після connect, зокрема pending-viewer-ам, і при кожній зміні. Коли один host витісняє іншого, `offline` не надсилається.

## Ліміти relay (webhooxy PR #9 поверх #5, ще не змерджений)

- **Де задаються:** у DEST create/update (API/SDK), поле `ws: { roomId, displayName?, relay? }`. Тип `RelayLimitsDef` з `@webhooxy/shared`. На update ws-об'єкт замінюється повністю, тож `roomId` треба передавати щоразу. Зміни діють одразу, зокрема на вже підключені сокети.
- **Поля:** усі опційні. У таблиці default / max / min; значення поза межами дає `400`.

| Поле | default | max | min |
|---|---|---|---|
| `handshake.perIpPerMin` | 10 | 120 | 1 |
| `handshake.perRoomPerMin` | 60 | 1200 | 1 |
| `maxPending` | 20 | 200 | 1 |
| `maxViewers` (pending + authorized) | 50 | 500 | 1 |
| `authorizeTimeoutMs` | 5000 | 120000 | 100 |
| `pendingTimeoutMs` | 60000 | 120000 | 100 |
| `sendTimeoutMs` | 10000 | 120000 | 100 |
| `viewerSend.ratePerSec` | 10 | 100 | 1 |
| `viewerSend.burst` | 20 | 200 | 1 |
| `viewerSend.maxInFlight` | 5 | 50 | 1 |
| `viewerSend.queueSize` | 50 | 500 | 0 |
| `hostBroadcast.ratePerSec` | 30 | 200 | 1 |
| `hostBroadcast.burst` | 60 | 400 | 1 |
| `hostBroadcast.slowViewer.maxBuffered` | 100 | 10000 | 1 |
| `maxPayloadBytes` | 65536 | 1000000 | 1 |

- **Решта:**
  - `viewerSend.overflow: 'reject'`;
  - `hostBroadcast.slowViewer.policy: 'drop' | 'disconnect'`, за замовчуванням `'drop'`:
    - `'drop'` — повільний viewer цієї події не отримає;
    - `'disconnect'` — його відключають з `io server disconnect`, без `relay:denied`;
  - `allowedOrigins: string[]` — до 50 значень, точний збіг, а `[]` означає будь-який origin.
- **Глобальна стеля webhooxy:** 120 handshake за хвилину з IP (env `RELAY_HANDSHAKE_PER_IP_PER_MIN`). Перевіряється ще до звернення в БД.
- **MaControl:** кімнату має один користувач, тож варто задати `allowedOrigins` (dev-дашборд Vercel і `localhost` для `next dev`) і невеликий `maxViewers`. Tree агента може бути великим, тому треба перевірити, що його розмір вкладається в `maxPayloadBytes`.

## `data` (формат MaControl, webhooxy його не розбирає)

- `{ type: 'action', action }` — від viewer;
- `{ type: 'ping' }` — від viewer;
- `{ type: 'tree', tree }` — від host;
- `{ type: 'state', … }` — від host.

## Обмеження й секрети

- Один інстанс API: реєстр host-ів зберігається в пам'яті.
- Токен воркспейсу, `destId` і `mt_workspace` потрібні тільки агенту, тож вони лежать локально в `~/.config/awake/agent.env`.
- Ключ токена viewer-а спільний для Vercel і агента, тому він в Envify.
