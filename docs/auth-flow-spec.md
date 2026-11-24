# Spec: auth flow за каналами

Статус: спек, 2026-11-24. Завдання від lead-сесії: 9 знахідок трасування (HEAD `219efea` + незакомічений ORM) і 4 рішення
власника від 2026-11-23. Кожну знахідку підтверджено в коді (посилання нижче). Наживо через проксі не перевірялось.
Флоу в mia-flow: `http://localhost:3210/macontrol/pairing`.

Звідси посилаються: [auth-proxy-spec.md](auth-proxy-spec.md) (guard, стратегії, пароль, proxy через Vercel),
[connection-channels-spec.md](connection-channels-spec.md) (адреса `<networkType>:<channel>:<webUiHost>`, gateway).
Цей документ головний для кроків флоу; там, де вони розходяться, діє цей.

## Принципи (рішення власника 2026-11-23)

1. **Auth один на агента, не на канал** (Б4). Пароль, ковзна сесія, довіра пристрою і сполучення живуть в агенті
   (`agent/src/web-auth`, `agent/src/devices`, SQLite). Канал — лише стратегія guard-а: впізнає, звідки прийшло, і віддає
   principal. Жоден канал не має свого пароля, своїх сесій чи свого формату сполучення.
2. **Один власник пароля і сесії — агент** (А5). Vercel не тримає пароль і сесію (див. «Що лишається на Vercel»).
3. **Сховище конфігу Web UI знає лише логіка Web UI** (Б2). Канали в Upstash / Redis / KV нічого не пишуть. Канал, що
   став готовим, шле подію готовності `{ channel, state, address }`. `WebUiListener` в агенті (listener-патерн кіта, модуль
   Web UI) оновлює за нею опубліковану ціль. Upstash-клієнт переїжджає з `agent/src/presence` у модуль Web UI (А9).
4. **Свічі активних каналів належать Серверу** (Б1): `bot.remoteTailscale`, `bot.remoteWebhooxy` переїжджають з
   Агент → Огляд у «Сервер», разом зі збереженими значеннями.
5. **Без «relay» у наших іменах** (Б3). Наші імена: `proxy` (режим `http` | `ws` всередині), `webhooks`, id провайдера
   `webhooxy`. Wire-імена webhooxy (`relay:request`, namespace `/relay`, `X-Relay-Auth`) лишаються тільки на межі
   протоколу (клієнт webhooxy в агенті і заголовки проксі). Це стосується і коду при наступному дотику:
   `relay-request.service.ts` → `proxy-request.service.ts`, `RELAY_COOKIE_PREFIX` → `AGENT_COOKIE_PREFIX`,
   `contracts/src/relay.ts` → `proxy.ts`; документи — нижче.

## Канали і стратегії

| Канал | Адреса | Стратегія | Носій пристрою | Носій сесії |
|---|---|---|---|---|
| local | `local:loopback` / `local:lan:<ip>` | `local` | Bearer токен пристрою (LAN, http) | немає: LAN без пароля, лише довірена Wi-Fi |
| tailscale | `local:tailscale:<mac>.ts.net` | `tailscale` | кука `mc_device` | кука `mc_session` |
| webhooxy | `remote:webhooxy:<webUiHost>` | `webhooxy` | кука `mc_device` | кука `mc_session` |

LAN лишається на Bearer, поки немає https (auth-proxy-spec, відкрите питання 2). Principal `agent` (Mac-аппка, stdin,
розробка) приходить лише через `local` на loopback.

## Флоу 1. Сполучення

Один контракт для всіх каналів (А2): `pair` → `requestId` → poll. Старий формат `pair → { token }` прибрати.

| Крок | Маршрут | Principal | Що несе | SQLite | Подія |
|---|---|---|---|---|---|
| 1. Mac показує QR | — (Mac-аппка, локально) | `agent` | код одноразовий, TTL 2 хв, свій на канал | — | — |
| 2. Скан → запит | `POST /api/devices/pair { code }` | `@Public()` | код у body | — (запит у пам'яті `PairingService`) | `pairing.requested { channel, userAgent }` |
| 3. Mac питає «Дозволити?» | — | — | — | — | — |
| 4. Poll | `GET /api/devices/pair/:requestId` | `@Public()` | `requestId` | на `approved`: `devices` (`token_hash`, адреса підключення, `created_at`) | `pairing.approved` / `pairing.denied` |
| 5. Видача носія | відповідь poll на `approved` | — | local: `{ status, token }` у body; tailscale, webhooxy: кукі `mc_device` (400 днів) + `mc_session` (перша сесія 5 хв), без токена в body | `web_sessions` (лише cookie-канали) | — |

- Код з одного каналу в іншому не приймається (як зараз). «Новий код» скидає всі.
- Web UI в direct mode (`web/src/features/sdui/sources/hybrid-source.ts:41-50`) зараз чекає `{ token }` від `pair`, а
  агент віддає `{ requestId }` (`agent/src/devices/devices.controller.ts:26`) — direct mode переходить на poll, як
  сторінка `/pair`. Тоді `pair()` у hybrid-source стає тим самим хуком, що й `use-remote-pairing`.
- **Подія однакова для будь-якого каналу** (А3). Зараз Telegram-сповіщення отримує лише `via === 'tailnet'`
  (`agent/src/tailscale/listeners/tailscale-events.listener.ts:49`), тож LAN і проксі мовчать. Підписник сповіщень
  переїжджає з модуля tailscale в модуль сповіщень і слухає всі `pairing.*`; канал і `userAgent` — лише поля події, текст
  повідомлення показує канал («Новий пристрій через Tailscale / Wi-Fi / webhooxy»).

## Флоу 2. Підключення (вхід)

| Крок | Маршрут | Principal | Що несе | SQLite | Подія |
|---|---|---|---|---|---|
| 1. Shell gate | `GET /api/auth/session` | `web` або 401 `next: auth/login` | `mc_device` + `mc_session` | — (не продовжує, див. Флоу 3) | — |
| 2. Вхід паролем | `POST /api/auth/login { password, idleMinutes }` | `web-device` | `mc_device`, пароль у body | `web_sessions` (нова), ліміт спроб на пристрій | `auth.login { channel, deviceId }` |
| 3. Квиток viewer-а (поки є WS viewer) | `POST /api/devices/connect` (зараз `POST /connect` у власному роутері `relay-request.service.ts:37`) | `web` | `mc_session` | — | `device.connected { channel, deviceId }` |

**Vercel-проксі не перевіряє вхід** (А1). Зараз `web/src/app/api/mac/[...path]/route.vercel.ts:24` вимагає для
`connect` Vercel-куку `awake_session`, тож пристрій, сполучений через проксі, отримує 401 і не підключається ніколи. Має
бути так: проксі пропускає все, а пускати чи ні вирішує агент за principal.

| Маршрут через проксі | Хто проходить |
|---|---|
| `POST /api/devices/pair`, `GET /api/devices/pair/:requestId` | будь-хто (`@Public()`), агент перевіряє код |
| `POST /api/auth/login` | `web-device` (лише `mc_device`) |
| `GET /api/auth/session`, `POST /api/auth/touch`, `POST /api/auth/logout` | `web` |
| `POST /api/devices/connect` і решта API | `web` |

Маршрути вище — роути HTTP-застосунку агента. Через проксі зараз іде не він, а окремий роутер
`relay-request.service.ts` (`/pair`, `/pair/:id`, `/connect`) з `via: 'remote'` і без `web-auth`. Ціль — доставляти
запит з webhooxy в той самий HTTP-застосунок in-process (auth-proxy-spec, відкрите питання 3), тоді таблиця вище діє для
всіх каналів однаково, а власний роутер зникає.

`device.connected` — це та сама подія, що й для інших каналів, канал — поле. Telegram-сповіщення про вхід —
налаштування модуля сповіщень, не каналу.

## Флоу 3. Сесія

Ковзна сесія: `idle_minutes` 2 / 5 / 10, `now - last_active_at > idle_minutes` → відкликається.

**Активність — це дія користувача, а не polling** (А4). Зараз `WebSessionsService.validate`
(`agent/src/web-auth/services/web-sessions.service.ts:43`) оновлює `last_active_at` на кожен запит, а Web UI опитує кожні
2 с (`use-ui-tree.ts:10`, `use-hybrid-tree.ts:16`), тож поки вкладка відкрита, сесія не спливає ніколи. Має бути так:

- `validate` лише перевіряє і повертає `expiresAt`, нічого не пише;
- `last_active_at` продовжують тільки:
  - `POST /api/auth/touch` — його шле `use-idle-logout` на мишу, клавіші, дотик, скрол (не частіше ніж раз на хвилину);
  - `POST /api/auth/login` (нова сесія);
  - дії користувача: `POST /api/ui/events` (дія чи налаштування модуля). Мутація — це завжди дія людини;
- `GET` (дерево UI, статистика, `auth/session`) сесію не продовжують;
- `devices.last_seen_at` — «коли пристрій востаннє був видно», до сесії не має стосунку. Пишеться не частіше ніж раз на
  хвилину на пристрій (`pairing.service.ts:164` зараз пише на кожен запит).

| Крок | Маршрут | Principal | SQLite | Подія |
|---|---|---|---|---|
| Дія | `POST /api/auth/touch`, `POST /api/ui/events` | `web` | `web_sessions.last_active_at` | — |
| Сплив | будь-який запит після idle | → `web-device`, 401 `next: auth/login` | `web_sessions.revoked_at` | `auth.expired { deviceId }` |
| Вихід | `POST /api/auth/logout` | `web` | `web_sessions.revoked_at`, кука `mc_session` чиститься | `auth.logout { deviceId }` |

## Флоу 4. Відкликання

| Крок | Звідки | Principal | SQLite | Подія |
|---|---|---|---|---|
| Відкликати пристрій | Mac-аппка (команда `revoke` через `devices-bridge.service.ts:49`) або Telegram | `agent` / бот | `devices` (видалення або `revoked_at`), усі його `web_sessions.revoked_at` | `device.revoked { channel, deviceId }` |
| Живі з'єднання | — | — | — | WS: агент закриває viewer-а цього пристрою (kick); http: наступний запит → 401 |

Відкликання однакове для всіх каналів: пристрій прив'язаний до каналу, але гасить його агент, не канал.

## Звідки дія: source з principal (А8)

Зараз `onSettingChanged` модулів шле в Mac завжди `'web'` (`agent/src/modules/awake/awake.mac-module.ts:49`), тож Mac пише
«Web UI: …» і на команду з Telegram чи самої аппки. Має бути так: source береться з principal запиту і доходить до модуля
разом зі зміною.

| Principal / вхід | `ModuleSource` |
|---|---|
| `agent` (Mac-аппка, stdin) | `mac` |
| `device`, `web` | `web` |
| бот (оновлення Telegram) | `telegram` |
| `web-device` | налаштувань не міняє (403) |

`ModulesService.dispatch(event, source)` вже знає source. Його треба передати далі: `onSettingChanged(key, value, ctx,
source)` (або `ctx.source`), і `ctx.sendToMac(command, source)` бере його звідти, а не літерал. Канал у source не входить
(див. коментар `module-source.ts`): канал іде полем адреси.

## Що лишається на Vercel (А5)

Зараз два набори пароль + сесія: Vercel (`awake_session`, `DASHBOARD_PASSWORD`, `SESSION_SECRET`,
`web/src/server/session-cookie.ts`) і агент (`mc_session`, `MACONTROL_DASHBOARD_PASSWORD`). Лишається один — агент.

На Vercel лишається тільки:
- статика Web UI і Next-проксі `api/proxy/[...path]` (перейменування `api/mac`);
- читання цілі зі сховища (`baseUrl`, ключ підпису, `headers`) на кожен запит і підпис `X-Proxy-Sign`;
- сторінки `/app/login`, `/app/pair` — ті самі, що в local-збірці, і ходять на агент через проксі.

Прибрати після переходу: `awake_session`, `awake_idle`, `DASHBOARD_PASSWORD`, `SESSION_SECRET`, `isValidSession`,
перевірку в `route.vercel.ts:24`, видачу Upstash-доступу за Vercel-сесією.

## Перехід на `/api/proxy` без падіння dev (А7)

Зараз Vercel-проксі шле `X-Relay-Key` на `/api/relay/rooms/:roomId/request/*` (`route.vercel.ts:34-36`), а webhooxy
PR #16 цей шлях прибирає. Порядок, щоб dev не впав у день мержу #16:

1. **Агент:** стратегія `webhooxy` приймає обидва шляхи: старий `relay:request` без `x-webhooxy-proxy-url` і новий з
   `X-Proxy-Sign`, перевіреним через `verifyProxySign(secret, headers['x-webhooxy-proxy-url'], headers['x-proxy-sign'])`.
2. **Агент:** канал webhooxy шле подію готовності; `WebUiListener` публікує ціль (`baseUrl` = `<webhooxy>/api/proxy`,
   ключ підпису, `headers` з `X-Relay-Auth`).
3. **Vercel:** проксі бере ціль зі сховища, якщо вона там є, і шле на `/api/proxy` з `X-Proxy-Sign`. Немає цілі — старий
   шлях з `X-Relay-Key`. Деплой dev.
4. **Перевірка на dev:** сполучення, вхід, дія через новий шлях (спершу на гілці webhooxy з #16, задеплоєній у dev).
5. **webhooxy:** мерж PR #16 у dev — лише після кроку 4. Запит про порядок мержу йде в сесію webhooxy.
6. **Прибрати:** запасний шлях у проксі, `WEBHOOXY_RELAY_REQUEST_KEY`, `WEBHOOXY_ROOM`, `WEBHOOXY_WORKSPACE` з env
   Vercel, старий шлях у стратегії агента.

## Порядок реалізації

Реалізацію не починати, поки власник не закомітить ORM (у робочому дереві ~76 незакомічених файлів `agent/src`, зокрема
`devices`, `web-auth`, `sessions`). Після коміту:

1. А2 (pair → poll у direct mode), А3 (подія сполучення для всіх каналів), А8 (source з principal) — малі й незалежні.
2. А4 (активність без polling) — `web-auth` + `use-idle-logout`.
3. А1 + А5 + А7 разом, бо це один перехід Vercel-проксі; А7 залежить від webhooxy PR #16.
4. Б1 (свічі в «Сервер») — з етапом 6 плану (`docs/plans/2026-11-23-channels-naming-plan.md`).

## Відкрите

- Чи лишається WS viewer (`connect`, квиток), коли весь Web UI ходить через `/api/proxy` у режимі `ws`. Якщо ні —
  крок 3 Флоу 2 і `relay:authorize` / kick зникають, відкликання діє через 401.
- Telegram-сповіщення про кожен вхід (`auth.login`) чи лише про нові пристрої — налаштування модуля сповіщень.
