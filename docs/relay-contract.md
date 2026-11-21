# Relay через webhooxy: контракт

Дашборд (браузер) і агент на Mac тримають WSS до двосторонньої room у webhooxy. Агент виступає як `host`, браузери як `viewer`. webhooxy лише пересилає повідомлення: ключів relay він не зберігає й токенів viewer-а не перевіряє. Пускати viewer-а чи ні, вирішує сам host, тобто агент.

Модель погоджено з webhooxy 2026-11-21. Вона замінила попередні варіанти (REST-квитки, спільний JWT-ключ, ES256-ключі воркспейсу в `credentials`, reveal). Остаточні форми подій прийдуть разом з оновленим PR #5 (`feat/ws-relay` → `dev`), тому до того під них у коді не прив'язуватись.

## Середовища

Поки є тільки dev, і середовища не змішуються: MaControl dev UI (Vercel, гілка `dev`) → webhooxy API dev (`webhooks-proxy-dev.up.railway.app`) → агент на Mac. Агент і дашборд беруть URL webhooxy з env (`WEBHOOXY_URL` / `NEXT_PUBLIC_WEBHOOXY_URL`), а ключ `WEBHOOXY_JWT_TICKET_KEY` — з dev-середовища Envify. Прод (`main` ↔ production) з'явиться окремо.

## Підключення

- **Namespace:** socket.io `/relay` (path `/socket.io`, хост API).
  - Прод: `https://webhooks-proxy-dev.up.railway.app/relay`.
  - Локально: `http://localhost:3106/relay`.
- **host (агент):** підключається як звичайний WS-отримувач вебхуків, `io(URL + '/relay', { auth: { token, destId }, query: { mt_workspace } })`.
  - `token` — токен воркспейсу webhooxy.
  - Room береться з `transports.ws.roomId` DEST-а `destId`.
  - Новий host витісняє старого. Витіснений отримує disconnect з reason `'io server disconnect'` і не повинен перепідключатися в циклі.
- **viewer (браузер):** `io(URL + '/relay', { auth: { token, room }, query: { mt_workspace } })`.
  - Для webhooxy `token` непрозорий: формат і перевірку визначає MaControl (див. «Токен viewer-а»).
  - `auth` варто передавати функцією, щоб кожне (пере)підключення брало свіжий токен.

## Авторизація viewer-а агентом

1. Після connect viewer у стані pending. Він одразу отримує `relay:peer`, а `relay:send` повертає `401 PENDING`.
2. host отримує `relay:authorize { data: { viewerId, token, headers: { origin, user-agent } } }` з ack і протягом 5 с відповідає `{ data: { allow, sub? } }`.
3. Результат:
   - allow → viewer отримує `relay:authorized { data: { sub } }`;
   - deny, тайм-аут або помилка → `relay:denied`, з'єднання розривається.
4. Якщо host офлайн, viewer чекає до 60 с і отримує `relay:peer: offline`.
   - Щойно host підключиться, webhooxy надішле йому `relay:authorize`.
   - Якщо host так і не з'явився, через 60 с viewer отримує `relay:denied { message: 'HOST_OFFLINE' }`.
5. Host може будь-коли вигнати viewer-а через `relay:kick { data: { viewerId } }`. Viewer тоді отримує `relay:denied` з `KICKED`.

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
  2. host отримує `relay:message { 200, 'Success', data, meta: { from: <viewerSocketId> } }` і відповідає ack-ом `{ data }`;
  3. viewer отримує ack `{ 200, 'Success', data: <data з ack host-а> }`.

  Таймаут 10 с. Ping іде цим самим каналом.
- **host → viewers:** host шле `relay:broadcast { data }` і отримує ack `{ 200, 'Success', data: null }`. Кожен авторизований viewer отримує `relay:message` з `meta.from: 'host'`.
- **Присутність:** `relay:peer { 200, 'Success', data: { host: 'online' | 'offline' } }` приходить після connect і при кожній зміні. Коли один host витісняє іншого, `offline` не надсилається.

## `data` (формат MaControl, webhooxy його не розбирає)

- `{ type: 'action', action }` — від viewer;
- `{ type: 'ping' }` — від viewer;
- `{ type: 'tree', tree }` — від host;
- `{ type: 'state', … }` — від host.

## Обмеження й секрети

- Один інстанс API: реєстр host-ів зберігається в пам'яті.
- Токен воркспейсу, `destId` і `mt_workspace` потрібні тільки агенту, тож вони лежать локально в `~/.config/awake/agent.env`.
- Ключ токена viewer-а спільний для Vercel і агента, тому він в Envify.
