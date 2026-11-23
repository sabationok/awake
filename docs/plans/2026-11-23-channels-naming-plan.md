# План: канали зв'язку, імена MaControl, Web UI

Спека: [connection-channels-spec.md](../connection-channels-spec.md). Кожен етап — окремий коміт у `dev`, після кожного
`tsc` агента, `next build` (local), `scripts/build.sh`.

## Етап 1. Слова (малий, без міграцій)

- «Пульт» → «Web UI»: `agent/src/modules/helpers/session-source-label.ts`, `Sources/Features/Agent/AwakeModel+Agent.swift:235`,
  `Sources/Features/Agent/AgentService+Status.swift`, `Sources/Features/Server/ServerSection.swift`,
  `Sources/Features/Server/ServerDangerZone.swift`, `web/src/features/sdui/components/app-shell.tsx`,
  `web/src/features/sdui/sources/local-source.ts`.
- Підписи: `remote-access.ts` (Webhooxy — канал, без Vercel), `agent-enabled.ts` (агент — бізнес-логіка, Mac / Web UI /
  Telegram), `agent-config.ts:4`.

## Етап 2. Дозволи і інсталяція без пароля

- `scripts/install.sh`: прибрати крок sudoers і `sudo`; правила ставить аппка в «Дозволах».
- `scripts/uninstall.sh`: прибирати правила через `osascript … with administrator privileges` (системний діалог), не `sudo`.
- `PermissionService.swift`: імена `mc-<rule>`, `.mc-<rule>.tmp`, `mc-sudoers-*`; старі `awake-*` / `awake` не
  переносяться: видаляються вручну, дозволи видаються заново під `mc-*`.
- Абзац про два рівні дозволів — у `PermissionSection` footer (вже близько) і `docs/SPEC.md`.

## Етап 3. Конфіг і файли `~/.config/macontrol`

- Один шлях на сторону: Swift `AppPaths.configDir`, агент `CONFIG_DIR` у `agent-config.ts`; усі `.config/awake` (EnvFile,
  AwakeScript, AppSecretsStore, AgentService, AgentCache, AgentSettingsStore, TelegramSettingsStore, EnvifySettingsStore,
  LogStore, read-app-secrets, read-telegram-env, read-envify-token, webhooks.service) читають його.
- Міграція в аппці до старту агента: перенести каталог, `awake.db*` → `macontrol.db*`, `awake.log` → `app.log`.
  Перевірка на копії каталогу.
- `Resources/awake` (скрипт) і `~/.local/bin/awake` → `macontrol`; старий symlink прибрати.

## Етап 4. Адреса підключення

- Контракт: `NetworkType`, `Channel`, `ConnectionAddress { networkType, channel, webUiHost }` у `contracts/src`.
- База: колонки `network_type`, `channel`, `web_ui_host` у `devices` замість `via`, міграція в `database.service.ts`.
- Агент: `requestPath` → `connectionAddressOf(req)` (listener, `Host`, `Tailscale-User-Login`); пейринг і сесії пишуть адресу.
- Список пристроїв віддає адресу; `unknown` не відкидається.

## Етап 5. Картка пейрингу

- `AgentDevices.Mode` → `networkType` (Локально / Дистанційно) + канал усередині (сегменти, недоступні сірі з причиною).
- `PairingCard.swift`: QR / URL / підказка на канал.
- `DevicesSection`: сполучені пристрої під кожною вкладкою, фільтр за `networkType`, рядок «канал · host» або «канал
  невідомий».

## Етап 6. «Сервер» і «Web UI» в аппці

- `MainPage`: `.server(ServerPage)` з `.overview`, `.stats`, `.control`; новий `.webUi`.
- `ServerSection` розбити на `ServerOverviewSection`, `ServerStatsSection` (`ServerCharts`), `ServerControlSection`
  (керування, порти, `ServerDangerZone`).
- `WebUiSection`: свіч «Пускати Web UI», видимість модулів / сторінок, звідки збірка. Агент: налаштування
  `webUi.enabled` і `webUi.hiddenPages`, guard відкидає `web-device` і static `/app`, коли вимкнено.

## Етап 7. Bundle id і назва аппки (останній)

- ~~`MaControl.app`~~ — зроблено 2026-11-23 (назва бандла, виконуваний файл, вікно, скрипти). Лишилось:
  `dev.vitalii.macontrol`, копія UserDefaults, нотатка про повторну видачу TCC; Sparkle-фід.
- Окремо, після підтвердження користувача: ризики в спеці, розділ 6.

## Потім (лише спека)

- Telegram: вхід у Web UI `oauth` / `qr`, дозвіл нових чатів бота кодом.
- `remote:*` канали (webhooxy, ngrok, tailscale funnel) — разом з relay з auth-proxy-spec.
