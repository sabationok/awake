# Relay через webhooxy: контракт

Дашборд (браузер) і агент на Mac тримають WSS до двосторонньої room у webhooxy. Агент виступає як `host`, браузери як `viewer`. Контракт погоджено з сесією webhooxy 2026-11-21.

- **Namespace:** socket.io `/relay`. Прод: `https://webhooks-proxy-dev.up.railway.app/relay`, локально: `http://localhost:3106/relay`. REST: `<base>/api`.
- **Авторизація однакова для обох ролей:** `io(URL + '/relay', { auth: (cb) => cb({ token: signFresh() }) })`. Node-клієнт може замість цього слати `Authorization: Bearer <jwt>`. Токен у query string не приймається. Що в токені — нижче, у «Relay JWT».
  - `auth` має бути функцією: `jti` одноразовий, тож кожне (пере)підключення підписує новий токен. Інакше після першого обриву reconnect отримає `UNAUTHORIZED`.
  - host (агент, `sub: 'macontrol-agent'`, `role: 'host'`): новий host витісняє старого. `destId` і `mt_workspace` у handshake не потрібні.
  - viewer (браузер, `role: 'viewer'`): токен підписує server action на Vercel після перевірки сесії дашборду.
  - Старий host-токен на `credentials.privateKey` працює лише для звичайної доставки вебхуків (namespace за замовчуванням), на `/relay` він не діє.
- **Ack усюди:** `{ status: 'ok', data? } | { status: 'error', code: 'HOST_OFFLINE' | 'TIMEOUT' | 'UNAUTHORIZED' | 'BAD_REQUEST', message? }`.
- **viewer → host:**
  1. viewer шле `relay:send { payload }` з ack;
  2. host отримує `relay:message { from: <viewerSocketId>, payload }` з ack;
  3. `data` з ack host-а повертається viewer-у.

  Таймаут за замовчуванням 10 с. Ping іде цим самим каналом.
- **host → viewers:** host шле `relay:broadcast { payload }`, кожен viewer отримує `relay:message { from: 'host', payload }`.
- **Присутність:** `relay:peer { host: 'online' | 'offline' }` приходить одразу після connect і при кожній зміні. Коли один host витісняє іншого, `offline` не надсилається.
- **Relay JWT** (замінив REST-квитки і host-токен 2026-11-21; `POST /api/relay/tickets/create` і `issueTicket` прибрано):
  - Кожен клієнт підписує токен сам, до webhooxy по нього не звертається.
  - Ключ — сирий HMAC `WEBHOOXY_JWT_TICKET_KEY`, той самий на обох сторонах, живе в Envify. Якщо в webhooxy ключа немає, він відхиляє всі viewer-підключення.
  - Header: `{ alg: 'HS256', typ: 'JWT' }`. `kid` зарезервовано під окремий ключ для кожного воркспейсу, зараз webhooxy його ігнорує.
  - Claims:
    - `iss` — slug воркспейсу, = `mt_workspace` у host-а;
    - `aud: 'webhooxy-relay'`;
    - `sub` — `'macontrol-agent'` або id користувача дашборду, лише для логів;
    - `room` — roomId DEST-а;
    - `role` — `'host'` або `'viewer'`;
    - `iat`, `exp` — exp = iat + 60, максимум 300;
    - `jti` — uuid, одноразовий, тому на кожне (пере)підключення потрібен новий токен.
  - Помилка будь-якої перевірки (підпис, aud, exp, role, room у воркспейсі `iss`, використаний jti) дає `connect_error` з message `UNAUTHORIZED`.
  - Обмеження: поки ключ один на все розгортання, прив'язку до воркспейсу тримають чесний `iss` і перевірка, що room належить цьому воркспейсу. Хто має ключ, може підключитися як host і захопити room. Згодом ключі розділять за ролями чи воркспейсами через `kid`.
- **Payload:** webhooxy його не розбирає, формат визначає MaControl:
  - `{ type: 'action', action }` — від viewer;
  - `{ type: 'ping' }` — від viewer;
  - `{ type: 'tree', tree }` — від host;
  - `{ type: 'state', … }` — від host.
- **Локальний тест:** seed-скрипт relay-сесії створює workspace, DEST з roomId, `WEBHOOXY_JWT_TICKET_KEY`.
