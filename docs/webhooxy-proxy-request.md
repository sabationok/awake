# Запит у webhooxy: роут `/proxy` (http | ws)

Від MaControl, 2026-11-23. Пов'язане: [connection-channels-spec.md](connection-channels-spec.md),
[relay-contract.md](relay-contract.md), [auth-proxy-spec.md](auth-proxy-spec.md) («Потім: relay через Vercel»).

## Навіщо

Web UI MaControl на сторонньому хості (Next.js serverless proxy) має ходити до агента на Mac звичайними HTTP-запитами
через webhooxy. Зараз ми даємо Web UI адресу `/webhooks`, а це прийом вебхуків: черга, ретраї, доставка «колись». Для
Web UI це не підходить: запит чекає відповідь одразу.

Приклад: Web UI просить усю статистику одним запитом:

```
GET <webhooxyBaseUrl>/api/proxy/api/stats
```

webhooxy пересилає його в destination у режимі `http` або `ws`, Mac відповідає, webhooxy повертає відповідь як є.

## Що просимо

1. **Новий роут `/proxy/*`**, окремий від `/webhooks`. Усе після `/proxy` — шлях у destination (`/proxy/api/stats` →
   `/api/stats`), query зберігається.
2. **Режими проксювання: лише `http` і `ws`.**
   - `http` — webhooxy робить HTTP-запит на URL destination і повертає відповідь синхронно.
   - `ws` — webhooxy передає запит підключеному host-у (як relay, `relay:request { method, path, headers, body }`) і
     чекає ack з відповіддю `{ status, headers, body }`.
3. **Без черги.** Якщо destination недоступний (host offline, HTTP не відповів), одразу `503 HOST_OFFLINE` / `504 TIMEOUT`.
   Нічого не ставиться в чергу і не ретраїться. Для порівняння:

   | | `queue` | `http` | `ws` |
   |---|---|---|---|
   | Прийом вебхуків (`/webhooks`) | так | так | так |
   | Проксювання (`/proxy`) | **ні** | так | так |

4. **Прозорість.** Метод, тіло (байти), хедери запиту — як є, окрім hop-by-hop. Відповідь: статус, тіло, усі
   `Set-Cookie` і хедери — як є (cookie modes з relay-contract діють і тут).
5. **Хедери каналу і підпису не чіпати:** `X-Proxy-Sign` (HMAC від Next.js proxy) і `X-Relay-Auth: Bearer <token>`
   доходять до Mac без змін. Перевіряє їх сторона MaControl; `X-Relay-Auth` webhooxy перевіряє публічним ключем workspace,
   як погоджено в auth-proxy-spec.
6. **Режим — налаштування destination**, як `transports.ws.relay`: напр. `config.transports.proxy.mode: 'http' | 'ws'`,
   задається і через destination bootstrap.
7. Ліміти (розмір тіла, timeout, rate) — як у relay, окремі значення для `/proxy`.

## Відкрите

- Формат помилок `/proxy`: HTTP-статус + тіло `{ statusCode, message, data: null }`, як у конверті relay?
- Чи потрібен streaming відповіді (SSE з агента) через `/proxy` у режимі `ws`, чи лише повна відповідь.

## Погоджено 2026-11-23

webhooxy робить одним PR від `dev` після #14. URL `<base>/api/proxy/*`; ack у `ws` — поточний контракт relay
`{ data: { statusCode, headers, body, bodyEncoding, cookies } }`; помилки — REST-форма `{ statusCode, message, innerCode }`.

- `X-Relay-Auth`: JWT HS256 на privateKey workspace, `type: 'proxy'`, `sub` = workspace, `aud` = destination, TTL 24 год,
  gateway міняє раз на 12 год. `X-Relay-Key` прибирається.
- `X-Proxy-Sign`: підпис path+query після `/proxy`, методу, часу і sha256 тіла; хост прив'язаний ключем.
- `ws` без room → 409; host не підключений → 503 `HOST_OFFLINE`.
- `Set-Cookie` у `http` — як є; перевірка з #14 лише для relay з браузера.
- SSE — потім. Rate limit — по токену (`aud`) + destination.

## Реалізовано: webhooxy PR #16 (draft, поверх #14, не змерджено)

- `ALL <base>/api/proxy/*`; режим `config.transports.proxy.mode`; без режиму → 403 `PROXY_DISABLED`; `ws` без room чи `http`
  без url → 409 `PROXY_NOT_CONFIGURED`; немає host-а → 503; повільно → 504.
- `X-Relay-Auth`: HS256, `type: 'proxy'`, `sub`/`aud` — slug-и, `exp` ≤ 24 год (+5 хв). SDK `signProxyToken(...)`.
- `X-Relay-Key` і `/api/relay/rooms/:roomId/request` прибрано.
- Ліміти, `sensitive`, `cookieMode` для обох режимів — з наявних `transports.ws.relay` (окремого `proxy.limits` немає).
- `relay:request` `meta.caller` тепер `{ workspace, destination }` (slug-и), раніше `{ credentialId }`.
- `http`: відповідь без `content-encoding` / `content-length` (fetch розпаковує gzip/br).
- Рядки `requests` з `type: 'proxy'`; `x-relay-auth` ніколи не зберігається відкритим.
- f7a49fe: `http` → 400 `BAD_PATH`, якщо шлях після `/proxy` виходить за базовий шлях destination (`..`, `%2e%2e`,
  `/base` → `/basement`). Токен `type: 'proxy'` приймається лише на `/api/proxy`: handshake host-а relay, вебхуки й
  bootstrap його відкидають. Агент MaControl для handshake host-а лишається на токені воркспейсу, не на proxy-токені.
- Відкрито: тіло JSON у `ws` приходить розібраним, тож `sha256(body)` у `X-Proxy-Sign` не збігається (варіанти a/b/c).
