# Spec: вхід на дашборд, пейринг, стратегії guard-а

Статус: шлях Tailscale реалізовано 2026-11-23 (не закомічено, live-перевірки з телефона ще не було); рішення 2026-11-22/23. Зараз робимо лише шлях **Tailscale**. Vercel і relay (webhooxy) відкладено, їхні рішення — у розділі «Потім: relay через Vercel».

Канали зв'язку, адреса підключення `<networkType>:<channel>:<webUiHost>`, імена MaControl у системі Mac, дозволи і Web UI: [connection-channels-spec.md](connection-channels-spec.md).

Діаграми: `.archify/sequence-tailnet-login-20261123-001500/pairing.html`, `login.html`.

## Мета

- Дашборд відкривається лише після входу. Довіра пристрою (`mc_device`) сама не пускає.
- QR сканується один раз при пейрингу. Після розлогіну потрібен пароль.
- Сесія ковзна: гасне після 2, 5 або 10 хв без дій (обирається при вході).
- Сесії, пароль, пейринг і їхній стан веде агент MaControl (`agent/`, SQLite). Веб лише UI.
- Mac недоступний → вхід неможливий, UI показує «Сервер недоступний».

## Ролі

| Хто | Що робить | Чого не робить |
|---|---|---|
| Агент MaControl (`agent/`) | Пароль, сесії (SQLite), пейринг, кукі `mc_*`, рішення «дозволено / який наступний крок»; роздає статику дашборду | Не знає сторінок UI, не повертає шляхи і редиректи |
| Веб (`web/`, збірка `build:local`) | UI, мапа «крок → сторінка», shell gate | Не підписує і не перевіряє сесії, не тримає пароль і токени |
| Mac-аппка (Swift) | Показує те, що дав Nest (QR-URL, «Дозволити?»), поле пароля | Не будує URL і коди сама |

Mac-аппка — повний виняток: ходить до Nest напряму локально з agent token, не через веб.

## Режим Tailscale (зараз)

- Агент роздає статику `web/out` і API на одному express-застосунку. Статика підхоплюється на льоту: спершу опублікований веб (`config.webPublishedDir`; `express.static` шукає файл на кожен запит, тож нова публікація діє без перезапуску), потім збірка з бандла аппки як запасна (`agent/src/main.ts`). Так оновлений фронтенд доступний через Tailscale і localhost; дашборд на Vercel цього не отримує.
- `tailscale serve --https=443` веде `https://<mac>.ts.net` на loopback-порт агента `tailnetPort` (47802). TLS знімає serve.
- Усе same-origin: браузер шле кукі `mc_*` сам, CORS не потрібен, Next-сервера і проксі в цьому режимі немає.
- Телефон має бути в tailnet власника. Публічного URL у Mac немає.

## Guard: реєстр стратегій

Один guard на заміну `AgentTokenGuard`. У нього реєстр стратегій, по одній на канал. Стратегія:

1. впізнає свій канал за ознакою, яку клієнт не підробить (локальний порт сокета, транспорт relay), а не за хедером;
2. перевіряє канал;
3. дістає, хто прийшов, і повертає principal або «не моє».

Ніхто не впізнав → 401 з `next: auth/login`.

| Стратегія | Як впізнає | Що перевіряє | Principal |
|---|---|---|---|
| `local` | loopback або LAN-адреса на основних портах | loopback: agent token; LAN: довірена Wi-Fi + Bearer токен пристрою (як зараз) | `agent`, `device` |
| `tailscale` | `req.socket.localPort === tailnetPort` | serve увімкнений, `Tailscale-User-Login` — власник tailnet, Origin для не-GET; далі `mc_device` + `mc_session`. Bearer токен пристрою не діє; головний токен агента лишається для розробки | `web`, `web-device`, `agent` |
| `webhooxy` | транспорт relay (in-process, не хедер) | `X-Proxy-Sign` (див. «Потім»), далі `mc_device` + `mc_session` | `web`, `web-device` |

- Назви стратегій конкретні, без загальних абстракцій. Новий канал — нова стратегія; роути не змінюються.
- Дві осі: стратегія — яким каналом прийшло; principal — хто прийшов. Роут дивиться лише на principal.
- Доступ задає роут: `@Public()` (як зараз `PUBLIC_ROUTE`) і `@Principals('agent', 'web', …)`. За замовчуванням роут відкритий `agent`, `device`, `web`; `web-device` пускає лише на пейринг і `auth/login`.
- Пейринг прив'язаний до стратегії: пристрій сполучається і потім ходить тим самим каналом (зараз `isDeviceToken(token, 'tailnet' | 'local')`).
- Перевірку Origin для не-GET робить guard (Next-проксі, який це робив, у цьому режимі немає).
- **ngrok і подібні тунелі** пересилають на localhost, тож агент побачив би їх як loopback з правами Mac-аппки. Якщо тунель з'явиться — лише на окремий loopback-порт і зі своєю стратегією, як `tailscale`.
- relay не має свого роутера: `relay-request.service.ts` перестає розбирати шляхи і передає запит у той самий Nest HTTP-застосунок in-process (відкрите питання 3).

## Відповідь Nest: дані і наступний крок

```ts
{ ok: false, error: { code: 'AUTH_REQUIRED' }, next: { type: 'auth', action: 'login' } }
```

- `next` описує дію (`type` + `action` + параметри), а не шлях. Тип — у `@awake/contracts`.
- Сторінку для кроку вибирає веб: одна мапа `type/action → сторінка` в `web/src/features/redirects/`.
- `callAgent` бачить `next` і переходить на сторінку з мапи.
- Повні переходи (скан QR): `/redirects?type=…&action=…`. У статичному експорті це клієнтська сторінка `redirects/page.local.tsx`: читає крок і робить `router.replace` за мапою. `next` перевіряється `safeNextPath`, `code` — форматом.

## Пейринг

1. Nest будує URL для QR: `https://<mac>.ts.net/app/redirects/?type=pair&action=request&code=…` (код одноразовий, TTL 2 хв). Замість `#p=` у `devices-bridge.service.ts` (`_tailnetLink`, `_link`).
2. Скан → `/redirects` → `/pair?code=…`. `takePairingCode` читає `?code=`; `#p=` лишається для вже показаних QR і прибирається пізніше.
3. `POST /api/devices/pair { code }` → Mac питає «Дозволити?» → `GET /api/devices/pair/:requestId` (poll).
4. Після схвалення poll-відповідь ставить дві кукі: `mc_device` (400 днів) і `mc_session` (перший вхід без пароля). Токен у body більше не віддається, `localStorage` (`awake.deviceToken`) не використовується.
5. Старі пристрої з токеном у `localStorage` сполучаються заново, міграції немає.

## Вхід на дашборд

Модуль `agent/src/web-auth/` (не `sessions`: `agent/src/sessions` — сесії Mac для статистики).

- `POST /api/auth/login` `{ password, idleMinutes: 2|5|10 }` → перевірка пароля, нова сесія, кука `mc_session`. Principal `web-device`: вхід лише з сполученого пристрою.
- `GET /api/auth/session` → `{ idleMinutes, expiresAt }` або 401 з `next: auth/login`. Продовжує сесію.
- `POST /api/auth/touch` → продовжує сесію (UI шле не частіше ніж раз на хвилину).
- `POST /api/auth/logout` → відкликає сесію, чистить `mc_session`; `mc_device` лишається.
- Для principal `web` стратегія перевіряє сесію на кожному роуті і продовжує її.

SQLite, таблиця `web_sessions`:

| Поле | Опис |
|---|---|
| `id` | uuid |
| `token_hash` | sha256 від opaque-токена з `mc_session` (сам токен не зберігається) |
| `device_id` | FK на пристрій; відкликання пристрою гасить його сесії |
| `idle_minutes` | 2 / 5 / 10 |
| `last_active_at`, `created_at`, `revoked_at` | ковзний таймаут: `now - last_active_at > idle_minutes` → недійсна |

Кукі `mc_device`, `mc_session`: HttpOnly, Secure, SameSite=Lax, без `Domain`. Lax, а не Strict: відкриття QR з камери — навігація без ініціатора. `Secure` працює, бо браузер бачить https від serve. Кукі агент читає своїм `readCookie` (`agent/src/common/read-cookie.ts`), без `cookie-parser`. Перша сесія після схвалення пейрингу — 5 хв.

Веб (local-збірка):

- Shell gate: `GET /api/auth/session` до рендеру дітей. 401 → `/login?next=…`. Mac недоступний → «Сервер недоступний».
- `web/src/features/auth/use-idle-logout.ts`: миша, клавіші, дотик, скрол → `auth/touch` (≤ 1/хв); тиша довше `idleMinutes` → `auth/logout`.
- **Префікси замість голих сторінок.** UI — під `/app` (`app/app/login`, `app/app/pair`, `app/app/redirects`, `app/app` — дашборд), API — під `/api`. `/` лише веде в `/app` (local-збірка зберігає query і `#p=`). Сторінки local-збірки — `*.local.tsx`, експорт з `trailingSlash` (`app/login/index.html`), бо статику роздає express.static.
- Vercel `middleware.vercel.ts` видалено: він ходив на всі роути з довгим negative-lookahead. Якщо щось інфраструктурне знадобиться, воно матчиться лише на `/api/:path*`.

## Пароль

- Задається в Mac-аппці, поле в «Ключі аппки» → локальний виклик Nest.
- Зберігається як інші Mac-only ключі: `MACONTROL_DASHBOARD_PASSWORD` у `~/.config/awake/secrets.env` (або Envify / process.env), поле «Пароль дашборду» в «Ключах аппки». Мінімум 12 символів; коротший вважається незаданим.
- Порівняння: scrypt-хеші обох значень з випадковою сіллю процесу і `timingSafeEqual` (`agent/src/web-auth/services/dashboard-password.service.ts`).
- Перевірка лише в Nest. Ліміт: 5 невдалих за 15 хв на пристрій → 429 на 15 хв.
- Пароль не заданий → `auth/login` повертає `PASSWORD_NOT_SET`, UI підказує задати його в Mac-аппці.

## Потім: relay через Vercel

Не робимо зараз. Relay потрібен лише для дашборду на Vercel: serverless-функція не в tailnet і до `ts.net` не дістанеться.

- **Проксі не знає, куди стукає.** Next-проксі `api/proxy/[...path]` (перейменування `api/mac`) не знає ні про webhooxy, ні про Tailscale, ні про інший канал. На кожен запит він дістає з Upstash ціль, яку налаштовуємо в рантаймі, без деплою:
  - `baseUrl` — куди слати (relay-кімната webhooxy, тунель, будь-що);
  - ключ підпису;
  - `headers` — хедери каналу, які проксі додає наосліп. Для webhooxy це `X-Relay-Auth: Bearer <token>` (нижче).

  Далі робить свою роботу: `${baseUrl}/${path}?query`, метод, тіло (байти), кукі `mc_*`, підпис; відповідь і всі `Set-Cookie` повертає без змін. У коді проксі немає `room`, `mt_workspace` чи `X-Relay-Key`: усе специфічне для каналу живе в налаштуваннях цілі (відкрите питання 4). Ціль у Upstash пише Mac (Upstash як «останнє опубліковане значення», бо serverless не тримає підписку).
- Інтерцептори проксі `{ match, onRequest?, onResponse? }` у route builder замість Vercel middleware. Логіки сесій у Next немає.
- **`X-Proxy-Sign`.** Щоб агент знав, що стукає саме наш сервер Vercel, а не будь-хто, хто знає `baseUrl`:
  - Mac генерує ключ підпису і кладе в Upstash поряд із `baseUrl`; Vercel читає його звідти.
  - Next підписує повний URL із query, метод, час і тіло: `HMAC-SHA256(key, method + "\n" + fullUrl + "\n" + timestamp + "\n" + sha256(body))`, хедер `X-Proxy-Sign: t=<unix>,v1=<hex>`.
  - Стратегія того каналу, яким прийшов запит (зараз це був би `webhooxy`), перевіряє підпис через `timingSafeEqual` і вікно часу ±60 с; поза вікном або без підпису → 401.
  - Ротація: Mac пише новий секрет, деякий час приймає обидва.
- **`X-Relay-Auth` замість `X-Relay-Key`.** Статичний `X-Relay-Key` (`rq_<kid>.<secret>`, `docs/relay-contract.md`) був зроблений за зразком proxy auth вебхуків. Для relay він не потрібен: агент після destination bootstrap має private key workspace і сам випускає токен для `relay:request`.
  - Агент підписує токен private key-єм workspace і сам кладе його в Upstash у `headers` цілі: `X-Relay-Auth: Bearer <token>`.
  - Токен іде лише хедером, не в query `baseUrl`: query потрапляє в логи і в підпис URL.
  - Проксі його не розбирає і не знає, що це, просто додає хедер.
  - Перевіряє токен webhooxy (публічний ключ workspace). Тип, `sub`/`aud` і TTL токена погодити з webhooxy, як і bootstrap-токен (`type`, `sub` = workspace, `aud` = destination). Поки це тест, токен у Upstash лежить відкритим; шифрувати чи ротувати — вирішимо пізніше.
- Кукі через relay: Nest ставить їх через `res.cookie()`, webhooxy пересилає готові `Set-Cookie` (`docs/relay-contract.md`, cookie modes).
- Скіл `frontend-nextjs`: правило «Middleware is the session gate only» суперечить цьому (gate у backend, інтерцептори в route builder). Правку вносить `frontend-skill-maintainer`.

## Відкриті питання

1. ~~Де зберігати пароль~~ — вирішено: `secrets.env` поряд з іншими ключами аппки (див. «Пароль»). Хеш на диску замість відкритого значення — можна пізніше, разом з іншими ключами.
2. **LAN на http.** `Secure`-кукі на `http://<lan>:port` не ставляться, тож стратегія `local` поки лишається на Bearer. Чи переводити LAN на кукі (тоді потрібен https) — вирішити окремо.
3. **In-process доставка relay-запиту** в HTTP-застосунок Nest (для `webhooxy`): inject через HTTP-адаптер або loopback-запит із секретом процесу. Вибрати, коли повернемося до relay.
4. **Що входить у підпис `X-Proxy-Sign`.** Хедери каналу вирішено: `headers` у цілі (`X-Relay-Auth`). Лишилось: агент підписує `fullUrl` так, як його бачить він: для relay це шлях після кімнати, тож що саме входить у підпис, узгодити з контрактом relay.

## Перевірка

- `cd web && npx tsc --noEmit`, `cd agent && npx tsc --noEmit`, тести Nest для `web-auth` (ковзний таймаут, відкликання пристрою, ліміт спроб) і стратегій guard-а (не власник tailnet → 403, лише `mc_device` → тільки пейринг/логін).
- Телефон у tailnet: QR → `/redirects?type=pair&action=request&code=…` → `/pair` → «Дозволити» → дашборд без пароля → бездіяльність → розлогін → вхід паролем.
- Не власник tailnet → 403. Mac вимкнено → «Сервер недоступний».
