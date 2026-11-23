# Запит у webhooxy: роут `/proxy` (http | ws)

Від MaControl, 2026-11-23. Пов'язане: [connection-channels-spec.md](connection-channels-spec.md),
[relay-contract.md](relay-contract.md), [auth-proxy-spec.md](auth-proxy-spec.md) («Потім: relay через Vercel»).

## Навіщо

Web UI MaControl на сторонньому хості (Next.js serverless proxy) має ходити до агента на Mac звичайними HTTP-запитами
через webhooxy. Зараз ми даємо Web UI адресу `/webhooks`, а це прийом вебхуків: черга, ретраї, доставка «колись». Для
Web UI це не підходить: запит чекає відповідь одразу.

Приклад: Web UI просить усю статистику одним запитом:

```
GET <webhooxyBaseUrl>/proxy/api/stats
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
