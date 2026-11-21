# Relay через webhooxy: контракт

Дашборд (браузер) і агент на Mac тримають WSS до двосторонньої room у webhooxy. Агент виступає як `host`, браузери як `viewer`. Контракт погоджено з сесією webhooxy 2026-11-21.

- **Namespace:** socket.io `/relay`. Прод: `https://webhooks-proxy-dev.up.railway.app/relay`, локально: `http://localhost:3106/relay`. REST: `<base>/api`.
- **host (агент):** `io(URL + '/relay', { auth: { token, destId }, query: { mt_workspace } })`.
  - `token` — JWT, підписаний `credentials.privateKey` воркспейсу.
  - Room сервер бере з `config.transports.ws.roomId` DEST-шару `destId`.
  - Нове підключення host витісняє старе.
- **viewer (браузер):** `io(URL + '/relay', { auth: { token: jwt } })`. `Authorization: Bearer <jwt>` теж приймається (polling, Node-клієнти). Через query string токен не приймається. Деталі нижче, у «Viewer JWT».
- **Ack усюди:** `{ status: 'ok', data? } | { status: 'error', code: 'HOST_OFFLINE' | 'TIMEOUT' | 'UNAUTHORIZED' | 'BAD_REQUEST', message? }`.
- **viewer → host:**
  1. viewer шле `relay:send { payload }` з ack;
  2. host отримує `relay:message { from: <viewerSocketId>, payload }` з ack;
  3. `data` з ack host-а повертається viewer-у.

  Таймаут за замовчуванням 10 с. Ping іде цим самим каналом.
- **host → viewers:** host шле `relay:broadcast { payload }`, кожен viewer отримує `relay:message { from: 'host', payload }`.
- **Присутність:** `relay:peer { host: 'online' | 'offline' }` приходить одразу після connect і при кожній зміні. Коли один host витісняє іншого, `offline` не надсилається.
- **Viewer JWT** (замінив REST-квитки 2026-11-21; `POST /api/relay/tickets/create` і `issueTicket` прибрано):
  - Server action на Vercel підписує токен сам, після перевірки сесії дашборду. До webhooxy він не звертається.
  - Ключ — сирий HMAC `WEBHOOXY_JWT_TICKET_KEY`, той самий на обох сторонах, живе в Envify. Якщо в webhooxy ключа немає, він відхиляє всі viewer-підключення.
  - Header: `{ alg: 'HS256', typ: 'JWT' }`. `kid` зарезервовано під окремий ключ для кожного воркспейсу, зараз webhooxy його ігнорує.
  - Claims:
    - `iss` — slug воркспейсу, = `mt_workspace` у host-а;
    - `aud: 'webhooxy-relay'`;
    - `sub` — id користувача дашборду, лише для логів;
    - `room` — roomId DEST-а;
    - `role: 'viewer'`;
    - `iat`, `exp` — exp = iat + 60, максимум 300;
    - `jti` — uuid, одноразовий, тому на кожне (пере)підключення потрібен новий токен.
  - Помилка будь-якої перевірки (підпис, aud, exp, role, room у воркспейсі `iss`, використаний jti) дає `connect_error` з message `UNAUTHORIZED`.
  - Обмеження: поки ключ один на все розгортання, прив'язку до воркспейсу тримають чесний `iss` і перевірка, що room належить цьому воркспейсу.
- **Payload:** webhooxy його не розбирає, формат визначає MaControl:
  - `{ type: 'action', action }` — від viewer;
  - `{ type: 'ping' }` — від viewer;
  - `{ type: 'tree', tree }` — від host;
  - `{ type: 'state', … }` — від host.
- **Локальний тест:** seed-скрипт relay-сесії створює workspace, DEST з roomId, host-токен і `WEBHOOXY_JWT_TICKET_KEY`.
