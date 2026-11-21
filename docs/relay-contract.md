# Relay через webhooxy: контракт

Дашборд (браузер) і агент на Mac тримають WSS до двосторонньої room у webhooxy. Агент виступає як `host`, браузери як `viewer`. Контракт погоджено з сесією webhooxy 2026-11-21.

- **Namespace:** socket.io `/relay` (path `/socket.io`, хост API). Реалізація: webhooxy PR #5 (`feat/ws-relay` → `dev`, коміт 6f3b9ba) відповідає цьому контракту. Документація: `packages/api/src/relay/CLAUDE.md` у webhooxy. Прод: `https://webhooks-proxy-dev.up.railway.app/relay`, локально: `http://localhost:3106/relay`. REST: `<base>/api`.
- **Авторизація однакова для обох ролей:** `io(URL + '/relay', { auth: (cb) => cb({ authorization: 'Bearer ' + signFresh() }) })`, це основний спосіб. Також приймаються `auth.token` і заголовок `Authorization` (Node). Префікс `Bearer` необов'язковий. Токен у query string не приймається. Що в токені — нижче, у «Relay JWT».
  - `auth` має бути функцією: `jti` одноразовий, тож кожне (пере)підключення підписує новий токен. Інакше після першого обриву reconnect отримає `UNAUTHORIZED`.
  - host (агент, `sub: 'macontrol-agent'`, `role: 'host'`): новий host витісняє старого. Витіснений отримує disconnect з reason `'io server disconnect'` і не повинен перепідключатися в циклі. `destId` і `mt_workspace` у handshake не потрібні.
  - viewer (браузер, `role: 'viewer'`): токен підписує server action на Vercel після перевірки сесії дашборду.
  - Старий host-токен на `credentials.privateKey` працює лише для звичайної доставки вебхуків (namespace за замовчуванням), на `/relay` він не діє.
- **WS-конверт як у mia-erp-server** (2026-11-21; остаточні форми прийдуть разом із PR relay-сесії, до того під них у коді не прив'язуватись):
  - запит від клієнта: `{ data, query?, headers? }`;
  - відповіді, ack і події від сервера: `{ statusCode, message, data, meta? }`, відправник у `meta.from`;
  - помилки в ack: `{ statusCode, message, data: null }` з `503 'HOST_OFFLINE'`, `504 'TIMEOUT'`, `400 'BAD_REQUEST'`, `401 'UNAUTHORIZED'`;
  - ack для `relay:broadcast`: `{ 200, 'Success', data: null }`.
- **viewer → host:**
  1. viewer шле `relay:send { data }` з ack;
  2. host отримує `relay:message { statusCode, message, data, meta: { from: <viewerSocketId> } }` і відповідає ack-ом `{ data }`;
  3. `data` з ack host-а повертається viewer-у в конверті.

  Таймаут за замовчуванням 10 с. Ping іде цим самим каналом.
- **host → viewers:** host шле `relay:broadcast { data }`, кожен viewer отримує `relay:message` з `meta.from: 'host'`.
- **Присутність:** `relay:peer { statusCode: 200, message: 'Success', data: { host: 'online' | 'offline' } }` приходить одразу після connect і при кожній зміні. Коли один host витісняє іншого, `offline` не надсилається.
- **Relay JWT** (замінив REST-квитки і host-токен 2026-11-21; `POST /api/relay/tickets/create` і `issueTicket` прибрано):
  - Кожен клієнт підписує токен сам, до webhooxy по нього не звертається.
  - **Ключ воркспейсу, ES256 (P-256).** webhooxy зберігає лише публічну половину в налаштуваннях воркспейсу. Проєкт тримає приватну в env `WEBHOOXY_JWT_TICKET_KEY` (Envify проєкту MaControl) як приватний JWK одним рядком JSON: `{"kty":"EC","crv":"P-256","x","y","d","kid":"rk_…","alg":"ES256"}`.
  - Header: `{ alg: 'ES256', kid: jwk.kid }`. Підпис: jose `new SignJWT(claims).setProtectedHeader({ alg: 'ES256', kid }).sign(await importJWK(jwk, 'ES256'))`, або `jsonwebtoken.sign(claims, crypto.createPrivateKey({ key: jwk, format: 'jwk' }), { algorithm: 'ES256', keyid: jwk.kid })`.
  - Ключ — облікові дані воркспейсу з `type: 'relay'` у `config.keyring` (поруч із `api`). Admin-ендпоінти, SDK `WorkspaceCredentialsSdk`:
    - admin-доступ: `POST /api/auth/login { key }` → `Authorization: Bearer`;
    - `POST /api/workspaces/credentials/create { workspaceId, type: 'relay' }` → `{ kid, type, privateJwk }`, приватний JWK показується лише раз; 409, якщо активний relay-ключ уже є (тоді rotate);
    - `POST /api/workspaces/credentials/rotate { workspaceId, type: 'relay' }`;
    - `POST /api/workspaces/credentials/revoke { workspaceId, kid }`;
    - `GET /api/workspaces/credentials/many?workspaceId=&type=` — лише метадані.
  - Після rotate старий ключ діє ще 1 годину, revoke діє одразу. Без ключа у воркспейсу будь-яке підключення до `/relay` отримує `UNAUTHORIZED`.
  - Claims:
    - `iss` — slug воркспейсу, за ним webhooxy шукає ключ;
    - `aud: 'webhooxy-relay'`;
    - `sub` — `'macontrol-agent'` або id користувача дашборду, лише для логів;
    - `room` — roomId DEST-а;
    - `role` — `'host'` або `'viewer'`;
    - `iat`, `exp` — exp = iat + 60, максимум 300;
    - `jti` — uuid, одноразовий, тому на кожне (пере)підключення потрібен новий токен.
  - Помилка будь-якої перевірки (підпис, aud, exp, role, room у воркспейсі `iss`, використаний jti) дає `connect_error` з message `UNAUTHORIZED`.
  - Компроміс: хто має приватний ключ проєкту, може підключитися і як host, тобто захопити room. Розділення за ролями — пізніше.
- **`data`:** webhooxy його не розбирає, формат визначає MaControl:
  - `{ type: 'action', action }` — від viewer;
  - `{ type: 'ping' }` — від viewer;
  - `{ type: 'tree', tree }` — від host;
  - `{ type: 'state', … }` — від host.
- **Обмеження:** один інстанс API (реєстр host-ів у пам'яті). Revoke поки що не розриває вже прийняті сокети.
- **Локальний тест** (webhooxy, гілка `feat/ws-relay`):
  1. `pnpm build:api`, потім `pnpm dev:api` (порт `PORT`, за замовчуванням 3106);
  2. `pnpm --filter @webhooxy/api relay:seed [workspaceSlug] [roomId]` (за замовчуванням `relay-local`, `relay-local-room`) — знаходить або створює воркспейс і DEST, ротує relay-ключ і друкує приватний JWK та зразкові JWT для host і viewer;
  3. приватний JWK — у server env MaControl як `WEBHOOXY_JWT_TICKET_KEY`.
