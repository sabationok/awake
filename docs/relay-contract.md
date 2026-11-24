# Relay через webhooxy: контракт

> **Замінено (2026-11-24).** Документ історичний і описує схему до `/api/proxy`: WS viewer з квитками, `X-Relay-Key`,
> `/api/relay/rooms/:roomId/request`, кукі через `relay:request` і пароль + сесію на Vercel. Чинне:
> - флоу сполучення, входу, сесії і відкликання для всіх каналів, кукі `mc_device` / `mc_session` —
>   [auth-flow-spec.md](auth-flow-spec.md);
> - guard, стратегії, `X-Proxy-Sign`, `X-Relay-Auth`, ціль у сховищі — [auth-proxy-spec.md](auth-proxy-spec.md);
> - `/api/proxy` у webhooxy (режими `http` | `ws`, коди помилок) — [webhooxy-proxy-request.md](webhooxy-proxy-request.md).
>
> Розділ «Авторизація пристрою: два шари» більше не діє: Vercel не перевіряє сесію, пароль і сесію веде агент, а
> пристрій через проксі проходить ті самі роути й guard, що й інші канали. Wire-форми webhooxy (`relay:request`,
> namespace `/relay`, ліміти) тут ще правильні, поки агент на них працює.

Дашборд (браузер) і агент на Mac тримають WSS до двосторонньої room у webhooxy. Агент виступає як `host`, браузери як `viewer`. webhooxy лише пересилає повідомлення: ключів relay він не зберігає й токенів viewer-а не перевіряє. Пускати viewer-а чи ні, вирішує сам host, тобто агент.

Модель погоджено з webhooxy 2026-11-21. Вона замінила попередні варіанти (REST-квитки, спільний JWT-ключ, ES256-ключі воркспейсу в `credentials`, reveal). Форми подій остаточні, за PR #5 (`feat/ws-relay` → `dev`, head `bfbe742`, ще не змерджений).

## Середовища

Поки є тільки dev, і середовища не змішуються: MaControl dev UI (Vercel, гілка `dev`) → webhooxy API dev (`webhooks-proxy-dev.up.railway.app`) → агент на Mac. Кожен сервіс знає свій stage (агент `MACONTROL_STAGE`, дашборд `STAGE`, за замовчуванням `dev`) і бере URL webhooxy того самого stage з мапи в конфігу (`agent/src/config/agent-config.ts`, `web/src/server/stage-config.ts`); `WEBHOOXY_URL` лише перекриває його. Ключ `MACONTROL_JWT_KEY` (старе ім'я `WEBHOOXY_JWT_TICKET_KEY` ще читається) — з dev-середовища Envify. Прод (`main` ↔ production) з'явиться окремо.

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

> Поточна реалізація. Її замінить схема «Авторизація пристрою: два шари» нижче.

- Server action на Vercel підписує його після перевірки сесії дашборду. Агент перевіряє його в `relay:authorize`.
- Ключ — `MACONTROL_JWT_KEY`: це ключ JWT аппки, а не webhooxy (старе ім'я `WEBHOOXY_JWT_TICKET_KEY` ще читається). Ключ спільний для Vercel і агента й лежить в Envify проєкту MaControl. Сам webhooxy його не знає і токен не перевіряє.
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
- **Override на сесію host-а** (PR #9, коміт `1abf28a`, ще не змерджений; форми остаточні):
  - **Handshake host-а:** `auth: { token, destId, relay?: RelayLimitsDef }`.
    - Помилки йдуть у такому порядку: `RATE_LIMITED` (глобальна стеля) → `UNAUTHORIZED` → `BAD_REQUEST` (невалідний `relay`).
    - Від viewer-а `auth.relay` ігнорується.
  - **Одразу після handshake** host отримує `relay:limits:effective { 200, 'Success', data: <усі розрезолвлені ліміти>, meta: { source: { override: boolean } } }`.
  - **Під час сесії** host шле `relay:limits { data: RelayLimitsDef }` з ack такої ж форми, як `relay:limits:effective`.
    - Кожен виклик повністю замінює override, `{}` його скидає.
    - Невалідний override → `{ 400, 'BAD_REQUEST', data: null }`, попередній лишається чинним.
    - Від viewer-а → `{ 403, 'FORBIDDEN' }`; від витісненого host-а → `{ 401, 'UNAUTHORIZED' }`.
  - **Пріоритет:** override → DEST → дефолти. Об'єкти зливаються глибоко, `allowedOrigins` замінюється цілим.
  - **Межі:** ті самі, що в DTO DEST; після злиття результат ще раз обрізається до стель. Глобальну стелю за IP override не змінює.
  - **Скільки живе:** тільки в пам'яті. Після disconnect host-а override тримається `pendingTimeoutMs`, потім видаляється. Новий host приносить свій. Зміни діють одразу на живі сокети.
  - REST-bootstrap override не приймає.
- **MaControl:** агент на старті передає в handshake `relay: { allowedOrigins, maxViewers, maxPayloadBytes }` зі свого stage-конфігу. Кімнату має один користувач, тож варто задати `allowedOrigins` (dev-дашборд Vercel і `localhost` для `next dev`) і невеликий `maxViewers`. Tree агента може бути великим, тому треба перевірити, що його розмір вкладається в `maxPayloadBytes`.

## `data` (формат MaControl, webhooxy його не розбирає)

Типи в `contracts/src/relay.ts`.

- viewer → host (`relay:send`), відповідь в ack:
  - `{ type: 'ping' }` → `{ type: 'pong' }`;
  - `{ type: 'tree' }` → `{ type: 'tree', tree }` (scope `all`);
  - `{ type: 'event', event: UiEvent }` → `{ type: 'accepted' }`. Налаштування зі scope `mac` з relay змінити не можна.
  - Помилка: `{ type: 'error', message }`.
- host → viewers (`relay:broadcast`): `{ type: 'tree', tree }` після кожної зміни стану Mac, налаштування чи події.

## Модуль Relay в агенті

- Код: `agent/src/relay/`. Перемикач `relay.enabled` (за замовчуванням вимкнено) і сторінка Relay видно лише в SwiftUI (scope `mac`). Вмикати й вимикати можна ще з Telegram: `/relay`.
- DEST, workspace і room host-а — з увімкненого вебхука `relay` у SQLite агента (таблиця `webhooks`; старий `relay.env` імпортується один раз). Секрети глобальні: `WEBHOOXY_WORKSPACE_TOKEN` і `MACONTROL_JWT_KEY` з process.env, Envify або `~/.config/awake/secrets.env` (старий `relay.env` ще читається).
- Стан host-а: `off`, `unconfigured`, `connecting`, `online`, `offline`, `evicted`, `refused`. Перехід активний ↔ неактивний (після 10 с без змін) іде в Telegram, перемикач `telegram.events.relay.status`.
- Сесії: останні 20 viewer-ів, яких агент пустив, з поміткою «через проксі webhooxy». Подія виходу viewer-а (`relay:viewer:left`) ще не погоджена з webhooxy.
- Дашборд: server action `getRelayAccess` (`web/src/server/relay-actions.ts`) підписує квиток для дійсної сесії; env Vercel: `MACONTROL_JWT_KEY`, `WEBHOOXY_ROOM`, `WEBHOOXY_WORKSPACE`, а URL — зі stage. Пріоритет режимів дашборду: напряму → relay → лише перегляд.

## Авторизація пристрою: два шари (контракт фінальний; webhooxy#12 відкритий, агент ще не реалізований)

Замінює поточну схему, де квиток підписує Next (розділ «Токен viewer-а»). Next стає тупим проксі: має одну адресу upstream і нічого не знає про relay, room чи квитки. Ключ квитків лежить лише на Маці.

| | Шар 1: пристрій | Шар 2: signed URL |
|---|---|---|
| Що відповідає | чи пристрій свій | можна відкрити сокет зараз |
| Носій | кукі `mc_device` (HttpOnly) на домені дашборду | `ticket` у query URL сокета |
| Час життя | до відкликання | ≤ 300 с, одноразовий `jti` |
| Видає / перевіряє | Мак: pairing / кожен HTTP-запит | Мак: відповідь на connect / `relay:authorize` |

**Pairing (раз).** Мак показує дистанційний QR → `https://<dashboard>/pair#p=<code>` (код ~2 хв, попередній приймається ще період; `#`, щоб код не йшов у логи серверів). Сторінка `/pair` (web `features/pairing/use-remote-pairing.ts`):
- `POST /api/mac/pair { code }` → `{ requestId }`; Мак показує «Це ви?» з позначкою дистанційного запиту;
- `GET /api/mac/pair/<requestId>` раз на 1,5 с → `{ status: 'pending' | 'approved' | 'denied' | 'expired' }`;
- на `approved` Мак створює пристрій (`via: 'remote'`, зберігає лише хеш токена) і відповідає `cookies: [{ name: 'mc_device', httpOnly, sameSite: 'lax', maxAge: 400 днів }]`. Токен у JS не потрапляє.

Коди окремі для кожного шляху: локальний (`http://<LAN IP>:<httpPort>/#p=…`, лише в довіреній Wi-Fi) через relay не приймається, і навпаки. «Новий код» на Маці скидає обидва без періоду пільги.

**Connect (кожен раз).** Браузер → `POST /api/mac/connect` (з `mc_device`) → `relay:request` → Мак перевіряє пристрій і відповідає `RelayViewerAccess { url, room, workspace, token }` (те саме, що `getRelayAccess` для сесії з паролем). Квиток підписує Мак ключем `MACONTROL_JWT_KEY`, `sub = device:<id>`. Браузер підключається до сокета напряму, а Мак перевіряє квиток у `relay:authorize` і відмовляє, якщо пристрій уже відкликано. Сесія з паролем має пріоритет: квиток від Vercel, потім від Мака.

**Відкликання.** На Маці або через ТГ: пристрій видаляється, а його живі сесії Мак виганяє через `relay:kick`.

**Проксі Vercel** (`web/src/app/api/mac/[...path]/route.vercel.ts`). Прокидає запит і відповідь як є, але:
- в upstream іде лише кукі `mc_*`, сесія дашборду в webhooxy не потрапляє;
- URL upstream — зі stage (`readStageConfig`), кімната й workspace — `WEBHOOXY_ROOM` / `WEBHOOXY_WORKSPACE`, ключ — `WEBHOOXY_RELAY_REQUEST_KEY` (credential `relay-request`, `rq_…`), ніколи від клієнта;
- шлях лише з сегментів `[A-Za-z0-9_-]`, до 4; не-GET з чужим `Origin` — 403;
- помилки webhooxy (`{ message, statusCode, innerCode }`) перекладаються в `AppResponse`.

Middleware пускає `/pair` і `/api/mac/*` без сесії, а решту — із сесією або з кукі `mc_device` (лише наявність: перевіряє її Мак на connect). Upstash пристрою без пароля не видається.

**webhooxy: `relay:request` (контракт хоста фінальний; #5 → #9 → [webhooxy#12](https://github.com/sabationok/webhooxy/pull/12) змерджені в dev, #12 → `f59fbcc`; режими кук і bootstrap — [webhooxy#14](https://github.com/sabationok/webhooxy/pull/14) → dev, не змерджений).**

- **Ендпоінт:** `ALL /api/relay/rooms/:roomId/request[/<path>]?mt_workspace=<slug>`. Метод і суфікс `/<path>` потрапляють у `data.method` і `data.path`; без суфікса `path` = `/`.
- **Ключ:** `X-Relay-Key: rq_<kid>.<secret>`, credential типу `relay-request`.
  - Створюється через `POST /api/workspaces/credentials/create { workspaceId, type: 'relay-request', destId }`. Відповідь: `{ kid, version, type, key, destId }`, де `key` і є значення заголовка.
  - Один поточний ключ на DEST. Після ротації старий працює ще 1 год.
  - Ключ лежить лише в env проксі (Envify), клієнт його не бачить. webhooxy вирізає цей заголовок, тож `Authorization` браузера доходить до хоста без змін.
- **server → host `relay:request` (з ack):**
  ```ts
  { statusCode: 200, message: 'Success',
    data: { method, path, query: Record<string, string | string[]>, headers: Record<string, string>,
            body, bodyEncoding: 'json' | 'text' | 'base64' },
    meta: { requestId, via: { server }, caller: { credentialId } } }   // довірене — лише meta
  ```
  - `mt_workspace` з `query` прибрано.
  - Без тіла: `body: null`, `bodyEncoding: 'json'`. Невалідний JSON приходить як `'text'`.
  - `headers` приходять як є, `cookie` теж. webhooxy вирізає hop-by-hop, `host`, `content-length`, `x-relay-key` і `x-webhooxy-*`, а `x-forwarded-for` і `x-forwarded-proto` ставить сам.
- **Ack хоста:** HTTP-відповідь лежить усередині `data`:
  ```ts
  { data: { statusCode: number /* 200..599 */; headers?: Record<string, string | string[]>; body?: unknown;
            bodyEncoding?: 'json' | 'text' | 'base64';   // за замовчуванням 'json'
            cookies?: Array<{ name: string; value: string; maxAge?: number; path?: string;
                              httpOnly?: boolean; sameSite?: 'lax' | 'strict' }> },
    meta?: { sensitive?: RelaySensitiveRule[] } }   // лише для частини відповіді
  ```
  - **Кукі: два режими, рішення 2026-11-22 (webhooxy#14, ще не змерджений).**
    - `headers['set-cookie']` є → хост має свій парсер. webhooxy пересилає рядки як є, кожен окремим `Set-Cookie`, і ніколи не склеює їх через кому. Один рядок замість масиву вважається однією кукою і по комах не ділиться, тож кома в `Expires` проходить без змін. У режимі `'auto'` `cookies[]` при цьому ігнорується і не перевіряється: `domain` у ньому не дає `BAD_ACK`.
    - `set-cookie` немає → webhooxy будує `Set-Cookie` з `cookies[]` за правилами нижче.
    - Режим — налаштування relay у DEST (`config.transports.ws.relay.cookieMode`, задається і через destination bootstrap): `'auto'` (за замовчуванням, як описано вище: є обидва — беруться лише `headers`), `'set-cookie'` (лише готові рядки з `headers`), `'cookies'` (лише `cookies[]`).
    - Явний режим і непередбачене джерело → 502 `BAD_ACK` (рішення 2026-11-22, webhooxy `af92fed`). Мовчки не ігнорується.
      - `'set-cookie'`: `cookies` непорожній масив або не масив → `BAD_ACK`; відсутній або `[]` — нормально.
      - `'cookies'`: будь-який ключ `set-cookie` у `headers` (без урахування регістру), навіть `[]` чи один рядок → `BAD_ACK`.
    - TODO (не зараз, позначено в `parse-relay-ack.ts`): перевіряти готові рядки тими самими правилами (без `Domain` і `SameSite=None`, `Secure` додається). Поки за їхній вміст відповідає хост; перевіряється лише CR/LF/NUL.
    - Зберігання: готові рядки хоста лягають у `requests.response.headers['set-cookie']` і завжди захищені типовою дією workspace. У режимі `cookies` там нічого не зберігається.
    - Агент MaControl відповідає першим режимом: Nest ставить кукі через `res.cookie()`, готові `Set-Cookie` ідуть у `headers`.
  - Режим `cookies[]`: кожна кукі стає окремим `Set-Cookie` з такими атрибутами:
    - `Secure` завжди;
    - `HttpOnly`, якщо не `httpOnly: false`;
    - за замовчуванням `SameSite=Lax` і `Path=/`.
  - 502 `BAD_ACK` дають:
    - `domain`;
    - `sameSite: 'none'`;
    - `;`, `,`, CR або LF в імені, значенні чи `path`;
    - CR, LF або NUL у значенні будь-якого заголовка, готові рядки `set-cookie` теж.
  - Масив значень дозволений для будь-якого заголовка, не лише для `set-cookie`.
  - З `headers` webhooxy відкидає hop-by-hop, `content-length` і `x-webhooxy-*`. `set-cookie` більше не відкидається (див. режими кук вище).
  - Без `content-type` webhooxy ставить типовий для `bodyEncoding`.
  - Кожна відповідь має `x-webhooxy-request-id`.
  - Стримінгу і chunked немає.
- **Помилки:** `{ message: <CODE>, statusCode, innerCode: <CODE> }`. Перевіряються в такому порядку:
  - 401 `UNAUTHORIZED`;
  - 403 `FORBIDDEN`, якщо room не є DEST-room ключа;
  - 429 `TOO_MANY_REQUESTS`, спершу ліміт на credential, потім на room;
  - 413 `PAYLOAD_TOO_LARGE`;
  - 503 `HOST_OFFLINE`;
  - 504 `TIMEOUT`;
  - 502 `BAD_ACK`;
  - 502 `RESPONSE_TOO_LARGE`.
- **Ліміти:** у `config.transports.ws.relay` або в override хоста `auth.relay`:

  | Поле | За замовчуванням | Максимум |
  |---|---|---|
  | `requestTimeoutMs` | 10000 | 30000 |
  | `maxResponseBytes` | 1000000 | 1000000 |
  | `requests.perCredentialPerMin` | 60 | 6000 |
  | `requests.perRoomPerMin` | 600 | 12000 |
  | `sensitive` | до 50 правил разом | |

- **`sensitive`:** один масив правил з дією. Назви фінальні; relay-сесія реалізує їх у #12 разом з переходом на масив (замість чотирьох списків із 7c3c173), у коді їх ще немає.
  ```ts
  type RelaySensitiveRule =
    | { in: 'headers' | 'query' | 'cookies'; name: string; action?: RelaySensitiveAction }
    | { in: 'body'; path: string; action?: RelaySensitiveAction };
  type RelaySensitiveAction = 'encrypt' | 'mask' | 'remove';
  sensitive?: RelaySensitiveRule[]   // до 50 правил разом
  ```
  - Задається в чотирьох місцях:
    - handshake `auth.relay`;
    - `relay:limits { data }`;
    - DEST `config.transports.ws.relay`;
    - ack `meta.sensitive` (лише для відповіді).
  - **Основне джерело — destination bootstrap, рішення 2026-11-22 (webhooxy#14, ще не змерджений; агент MaControl ще не викликає bootstrap).** Хост передає мапу чутливих шляхів (заголовки, query, кукі, шляхи в тілі), які не логуються і не зберігаються відкритими, один раз у `POST /destinations/bootstrap`. Тоді правила діють і на записи, що з'явились до handshake, і після перезапуску хоста, а handshake і ack лише доповнюють їх.
    - Тіло: `{ relay?: { sensitive?: RelaySensitiveRule[]; cookieMode?: 'auto' | 'set-cookie' | 'cookies' } }`, пишеться в DEST `config.transports.ws.relay`. SDK: `bootstrapDestination({ ..., relay })`.
    - Необов'язкове: порожнє тіло або `relay: {}` нічого не змінює. Кожне передане поле замінює своє значення; інші ліміти і `roomId` лишаються. DEST без `ws` отримує `ws: { relay }`. Живі кімнати перечитують налаштування через подію `updated`.
    - Ліміти через bootstrap не приймаються: поля лімітів мовчки вирізаються (whitelist), не 400.
    - Невалідний `cookieMode`, `action` чи правило → 400, нічого не створюється і credentials не повертаються. Порядок: 401 (ключ) → 400 (query, тіло) → find-or-create WSPC/DEST.
    - Пізніший admin-update DEST з `ws` замінює весь об'єкт `ws`, ці поля теж (PUT-семантика).
  - Невалідне значення дає `connect_error BAD_REQUEST`, а для `relay:limits` — ack 400.
  - `name` для `headers` і `cookies` без урахування регістру. Для `query` це точне ім'я параметра, і крапка в ньому — частина імені.
  - `path` записується через крапку в JSON-тілі, масиви — через `*` (`items.*.token`). Діє на тіла запиту й відповіді.
  - `in: 'cookies'` поки нічого не робить: кукі й так шифруються всі.
  - Що означає кожна дія (впливає лише на рядок у `requests`; запит до хоста й відповідь викликачу не змінюються):
    - `encrypt` — значення зберігається зашифрованим;
    - `mask` — значення зберігається як `'[masked]'`;
    - `remove` — ключа в рядку немає взагалі; для шляхів з `*` — у кожному елементі.
  - Правило без `action` бере типову дію workspace: `WorkspaceConfig.relay.sensitiveDefault`, за замовчуванням `'encrypt'`. Вона лежить у конфігу workspace (шар контексту WSPC) і змінюється через API оновлення workspace.
  - Якщо один ключ потрапляє під кілька правил, перемагає найсуворіша дія: `remove` > `mask` > `encrypt`.
  - Агент для pairing-коду, `mc_device` і полів пристрою передає `mask` або `remove`.
  - Завжди захищені такі поля:
    - `authorization`, `cookie`, `set-cookie` і `x-relay-key` у запиті й відповіді;
    - значення всіх `cookies[].value` відповіді.

    Для них діє типова дія workspace, і відкритим текстом вони не зберігаються ніколи.
  - **Зберігання:** кожен запит, що пройшов перевірку ключа (тобто з 403 і далі), записується одним рядком у `requests`. Рядок має `type: 'relay'`, `id = meta.requestId` і містить відповідь.
    - Чутливі значення там зашифровані, замасковані або видалені, залежно від дії.
    - Тіла `text` і `base64` зберігаються як є, бо `bodyKeys` діють лише на JSON. Тож секрети в агента йдуть лише в JSON-тілах або в заголовках зі списку.
- **server → host `relay:viewer:left`:** `{ statusCode: 200, message: 'Success', data: { viewerId, reason: 'disconnect' | 'kicked' | 'timeout' | 'denied' } }`.
  - Шлеться лише для viewer-ів, які пройшли `relay:authorize`.
  - Іде поточному хосту. Якщо хоста в room немає, подія не шлеться.

**Проксі Vercel:** кілька `Set-Cookie` треба передавати окремими заголовками (`headers.append` / `getSetCookie()`, не `set`), інакше вони зіллються через кому. У webhooxy проксі сам додає `X-Relay-Key`, а клієнт цього ключа не бачить.

Шифрування `value` поки не робимо. Для webhooxy значення непрозоре, тож пізніше Мак може почати класти туди AES-GCM, і контракт від цього не зміниться.

## Обмеження й секрети

- Один інстанс API: реєстр host-ів зберігається в пам'яті.
- Токен воркспейсу, `destId` і `mt_workspace` потрібні тільки агенту, тож вони лежать локально в `~/.config/awake/agent.env`.
- Ключ токена viewer-а спільний для Vercel і агента, тому він в Envify.
