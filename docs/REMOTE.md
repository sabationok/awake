# Пульт і дашборд

```
Mac-аппка ──stdin/stdout──▶ агент (Nest, Node 22) ──▶ SQLite ~/.config/awake/awake.db
                              │  HTTP :47800, лише в довіреній Wi-Fi
                              └─SET awake:presence (TTL 45 с)──▶ Upstash ◀── дашборд на Vercel
```

- **Агент** (`agent/`) запускає Mac-аппка з `Resources/agent/agent.cjs`. Історія сесій, журнал і токени пристроїв живуть у SQLite на Mac.
- **Upstash** тримає лише живий стан і локальну адресу з одноразовим кодом сполучення. Адреса з'являється, тільки коли Mac у довіреній Wi-Fi.
- **Дашборд** (`web/`) збирається двічі: для Vercel (стан з Upstash, вхід за паролем) і статично для агента (повний пульт з командами).

## Налаштування

1. Vercel → Storage → `upstash-kv-claret-cable` → Connect Project → `awake`. Дашборд читає `KV_REST_API_*`.
2. Пароль дашборду, щонайменше 12 символів:
   `pnpm dlx vercel env add DASHBOARD_PASSWORD production` (у корені репозиторію).
3. Передеплой: `pnpm deploy:web`.
4. Awake → Пульт: REST URL і токен Upstash (Upstash Console → база → REST API), дозвіл геолокації, позначити домашню Wi-Fi довіреною.

## Збірка

- `scripts/build-agent.sh` збирає агента і статичний пульт у `Resources/agent`; `scripts/release.sh` викликає його сам.
- Локальна збірка `web` затирає `.next` Vercel-збірки: збирай Vercel-ціль останньою.
