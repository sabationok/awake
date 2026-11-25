# Spec: модуль «Групи» (супергрупи Telegram і, далі, інших провайдерів)

Статус: draft на погодження власником, 2026-11-25. Коду ще немає. Запит власника: модуль, що керує супергрупами «в
Telegram або деінде, якщо конектор це підтримує»; деталей не було, тож тут спершу що можливо, потім три обсяги на вибір
і докладно рекомендований.

Позначки: **[код]** — перевірено в коді репо (шлях:рядок), **[docs]** — перевірено в документації Telegram Bot API
або в typings бібліотеки, **[висновок]** — моє припущення чи рішення, не перевірене наживо. Жодного виклику Telegram API
під час підготовки не робилось.

Звідси посилаються: [connection-channels-spec.md](connection-channels-spec.md) §4 (Telegram як канал, дозвіл нового
чату кодом), [auth-flow-spec.md](auth-flow-spec.md) (source з principal), [sqlite-orm-spec.md](sqlite-orm-spec.md),
`.claude/agents/module-manifest-developer.md` (цільовий маніфест).

## 1. Коротко

**Можна вже зараз, без зміни бібліотеки:** бот, якого власник додав адміном у супергрупу з увімкненими топіками, може
сам створювати, перейменовувати, закривати, відкривати й видаляти топіки і слати в кожен окремо (`message_thread_id`).
Усе це є в Telegraf 4.16.3 з типами [docs]. Отже «сповіщення MaControl по топіках однієї групи» — реальна річ.

**Потребує зміни конектора:** зараз бот слухає лише один приватний чат власника і мовчки відкидає все інше, включно з
подією «бота додали в групу» [код]. Сповіщення йдуть лише в `TG_CHAT_ID` без топіка [код]. Частину сповіщень (Awake,
Стан Mac) шле не агент, а bash-скрипт через `curl` напряму в `TG_CHAT_ID` [код] — їх топіки не зачеплять, поки скрипт не
навчиться або поки ці події не переїдуть в агента.

**Неможливо для бота взагалі** [docs]: створити супергрупу; увімкнути в групі топіки (це робить власник у клієнті
Telegram); отримати повний список учасників (є лише адміни, кількість і конкретний учасник за id); бачити повідомлення
інших ботів; писати в групу частіше ніж ~20 повідомлень на хвилину.

**«Деінде»:** другого месенджера в репо немає. Telegram — єдиний конектор [код]. Шов під другий провайдер варто закласти
одним інтерфейсом (§5), але сам провайдер (Slack, Discord, Matrix) не будувати.

**Рекомендація:** обсяг A (топіки сповіщень в одній прив'язаній групі) плюс мінімальний шматок B (команди в групі лише від
власника). Обсяг C (загальне адміністрування групи з Web UI) — не робити зараз. Чому — §4.

## 2. Як працює конектор Telegram зараз

| Що | Як | Де |
|---|---|---|
| Бібліотека | `telegraf` 4.16.3 (pin), типи `@telegraf/types` 7.1.0 — це Bot API 7.1 (лютий 2024) | `agent/package.json:19` [код] |
| Отримання оновлень | long polling, `bot.launch({ dropPendingUpdates: true })`, `allowedUpdates` не задано, тож Telegram бере попереднє значення | `telegram-bot.service.ts:111` [код]; поведінка без `allowed_updates` — [docs] `@telegraf/types/methods.d.ts:33` |
| Мережа | `https.Agent({ family: 4 })` через зависання IPv6 | `telegram-bot.service.ts:60` [код] |
| Секрети | `TG_BOT_TOKEN`, `TG_CHAT_ID` з `~/.config/awake/telegram.env` (або `MACONTROL_TELEGRAM_ENV`); без обох бот не стартує | `helpers/read-telegram-env.ts`, `helpers/parse-telegram-env.ts` [код] |
| Хто може говорити з ботом | один middleware `isOwnerChat`: `chat.type === 'private'` **і** `chat.id === from.id === TG_CHAT_ID`. Усе інше (групи, чужі люди, службові оновлення) відкидається без відповіді | `services/telegram-bot/helpers/is-owner-chat.ts:4`, `telegram-bot.service.ts:145` [код] |
| Команди | з реєстру `@Bot(MACONTROL_BOT, { namespace, command })`; `setMyCommands` без scope (тобто для всіх чатів); перемикачі `telegram.commands.<ns>` | `telegram-bot.service.ts:82,156`, `bot/services/bot-router.service.ts` [код] |
| Кнопки | `callback_data` `nav|do|act|menu:<module>:…`, після дії меню редагується | `telegram-bot.service.ts:164` [код] |
| Сповіщення | реєстр джерел `TelegramNotificationsService` (`notify$`), listener перевіряє перемикач `telegram.events.<source>.<type>` і шле `bot.notify(html)` → `sendMessage(env.chatId, …)`. Поки бот не піднявся — тримає 10 останніх | `notifications/telegram-notifications.service.ts`, `services/telegram-bot/telegram-notifications.listener.ts:10,42`, `telegram-bot.service.ts:89` [код] |
| Джерела, які шле скрипт Mac (`viaMac`) | `awake`, `system`: їх шле `Resources/awake` функцією `say()` через `curl … sendMessage chat_id=$TG_CHAT_ID`; перемикачі агент пересилає в Mac, а Swift пише їх у `TG_EVENTS` у `telegram.env` | `Resources/awake:74-91`, `telegram.mac-module.ts:68`, `modules/awake/constants/awake-notifications.ts:7` [код] |
| Хто пише `telegram.env` | Swift `TelegramSettingsStore.save` перезаписує файл цілком лише трьома ключами (`TG_BOT_TOKEN`, `TG_CHAT_ID`, `TG_EVENTS`) | `Sources/Features/Telegram/TelegramSettingsStore.swift:47-56` [код] |
| Транспорт | `TransportsService.register({ id: 'telegram', … })`; `ModuleSource = 'mac' \| 'telegram' \| 'web'` | `transports/transports.service.ts`, `modules/types/module-source.ts` [код] |

Де «один приватний чат» зашито в припущення:

1. `isOwnerChat` — відкидає будь-який не-приватний чат [код].
2. `TelegramEnv.chatId` — один рядок, і він водночас id чату і id користувача-власника (у приватному чаті вони рівні) [код].
3. `TelegramBotService.notify(html)` — без адресата, завжди `env.chatId` [код].
4. Скрипт `say()` — `chat_id=$TG_CHAT_ID`, без `message_thread_id` [код].
5. `setMyCommands` без scope — команди показуються всюди, де є бот, хоч працюють лише в приватному чаті [код].
6. Кнопки меню не перевіряють, хто натиснув: у приватному чаті це не потрібно, бо middleware вже відсік чужих [код]. У
   групі будь-хто з учасників може натиснути кнопку під повідомленням бота [висновок, поведінка Telegram].
7. Журнал бота (`bot_events`) пише `source`, але не хто саме (user id) [код, `bot-journal/entities/bot-event.entity.ts`].

## 3. Що дає Bot API у супергрупі і що з цього є в Telegraf 4.16.3

Методи в `telegraf/typings/telegram.d.ts` (рядки в дужках) [docs]:

| Можливість | Методи | Право адміна бота | У Telegraf 4.16.3 |
|---|---|---|---|
| Топіки | `createForumTopic` (376), `editForumTopic` (387), `closeForumTopic` (398), `reopenForumTopic` (409), `deleteForumTopic` (420), `unpinAllForumTopicMessages` (430), General: `edit/close/reopen/hide/unhide` (440-478), `getForumTopicIconStickers` (365) | `can_manage_topics` (на видалення ще `can_delete_messages`) | так |
| Відправка в топік | `message_thread_id` в extra `sendMessage` та інших `send*`; у вхідних `is_topic_message`, `message_thread_id` | — | так |
| Службові події топіків | `forum_topic_created/edited/closed/reopened`, `general_forum_topic_hidden/unhidden` | — | так (`message.d.ts:212`) |
| Інфо групи | `getChat` (172: `is_forum`, права, опис), `setChatTitle` (239), `setChatDescription` (240), `setChatPhoto` (232) | `can_change_info` | так |
| Права учасників за замовчуванням | `setChatPermissions` (193) | `can_restrict_members` | так |
| Закріплення | `pinChatMessage` (245), `unpinChatMessage` (252), `unpinAllChatMessages` (257) | `can_pin_messages` | так |
| Запрошення | `exportChatInviteLink` (227), `createChatInviteLink` (228, з лімітом і терміном, `creates_join_request`), `revokeChatInviteLink` (231) | `can_invite_users` | так |
| Заявки на вступ | `approveChatJoinRequest` (618), `declineChatJoinRequest` (625), оновлення `chat_join_request` | `can_invite_users` | так |
| Учасники | `banChatMember` (199), `unbanChatMember` (268), `restrictChatMember` (221), `promoteChatMember` (216), `setChatAdministratorCustomTitle` (222), `banChatSenderChat` (632) | `can_restrict_members`, `can_promote_members` | так |
| Читання учасників | `getChatAdministrators` (176), `getChatMember` (182), `getChatMemberCount` | — | так |
| Повідомлення | `deleteMessage` / `deleteMessages` (350-356) | `can_delete_messages` | так |
| Вийти з групи | `leaveChat` (262) | — | так |
| Команди лише для групи / її адмінів | `setMyCommands(…, { scope })`, `BotCommandScopeChat`, `…ChatAdministrators`, `…ChatMember`, `…AllGroupChats` | — | так (`settings.d.ts:77`) |
| Права, які бот просить при додаванні | `setMyDefaultAdministratorRights` (660) | — | так |

Оновлення і `allowed_updates` [docs, `@telegraf/types/update.d.ts`]:

- `my_chat_member` — бота додали, видалили, змінили йому права. Приходить за замовчуванням.
- `chat_member` — зміни статусу інших учасників. Лише якщо бот адмін **і** `chat_member` явно є в `allowed_updates`
  (порожній список означає «все, крім `chat_member`»).
- `chat_join_request` — заявки на вступ (бот адмін з `can_invite_users`).
- `message_reaction` — лише адмін і явно в `allowed_updates`.

Privacy mode [docs, Bot FAQ]: з увімкненим режимом бот у групі бачить лише команди собі (`/cmd@bot`), відповіді на свої
повідомлення і службові повідомлення. **Бот-адмін бачить усі повідомлення** (крім інших ботів) незалежно від режиму. Для
топіків бот мусить бути адміном, тож він бачитиме весь текст групи — модуль має його ігнорувати й не логувати [висновок].

Ліміти [docs, Bot FAQ]: ~1 повідомлення/с в один чат, **не більше 20 повідомлень на хвилину в одну групу**, ~30/с
загалом; понад — `429` з `retry_after`.

Чого бот не може [docs: відсутність методів у Bot API / typings]:

- створити групу чи супергрупу, додати себе в групу, перетворити групу на форум (`is_forum` вмикає власник у клієнті);
- отримати список усіх учасників (лише адміни, кількість, один учасник за id; решту можна лише накопичувати з
  `chat_member` і повідомлень);
- бачити повідомлення інших ботів, читати історію до свого приходу;
- додати користувача в групу (лише посилання-запрошення).

Новіше за наші typings (Bot API 7.2 → 10.5, changelog на 2026-11-22) [docs]: топіки в приватних чатах з ботом (9.3-9.4,
`createForumTopic` у приватному чаті), теги учасників (9.5), `setMySettings` для privacy mode і топіків (10.5), спільноти
(10.2). Телеграф 4.16.3 їх не типізує; доступні лише через `bot.telegram.callApi(...)` без типів [висновок]. Важливо:
**топіки в приватному чаті з ботом (9.4)** дають той самий результат «сповіщення по розділах» без жодної групи. Це
альтернатива обсягу A, див. відкрите питання 1.

## 4. Обсяги, від меншого до більшого

### A. Топіки сповіщень в одній групі

Власник створює супергрупу, вмикає топіки, додає бота адміном з `can_manage_topics`. Бот впізнає, що додав власник,
просить підтвердження в приватному чаті, і після «Прив'язати» сам створює по топіку на джерело сповіщень (Агент, Таймер
сну, Кінець сесії, Tailscale, Webhooxy, Групи). Кожне сповіщення йде у свій топік; приватний чат лишається для команд і
як запасний канал.

Власник отримує: сповіщення, розкладені по розділах, з окремим mute на кожен топік у клієнті Telegram (це дає сам
Telegram, без нашого коду), і групу, куди можна додати ще людину лише на читання.

Обсяг: 2 таблиці, зміна middleware, адресат у `notify`, черга під ліміт 20/хв. Без змін контракту UI (§6.6).

### B. Команди бота в групі з allow-list учасників

Те саме плюс команди й кнопки працюють і в групі, не лише для власника: allow-list user id з датою видачі й відкликання;
новий учасник отримує доступ кодом з Mac (як пейринг пристрою, connection-channels-spec §4).

Власник отримує: керування Mac кількома людьми з однієї групи. Ціна: другий рівень auth (хто з учасників може що), бо
зараз усі дії бота рівноправні — сон, блокування, гучність; кнопки в групі видно всім, отже кожна натиснута кнопка мусить
перевірятися по `from.id`; анонімні адміни (`GroupAnonymousBot`, `sender_chat` = група) не мають особи — їм лише відмова
[висновок]. Це питання auth, і за auth-flow-spec його вирішує не модуль, а агент (principal). Окремий спек.

**Мінімальний шматок B, який раджу взяти в A:** у прив'язаній групі команди й кнопки працюють **лише для власника**
(`from.id === TG_CHAT_ID`), решті — тиша. Нового рівня auth не треба: той самий principal, що й у приватному чаті.

### C. Загальне адміністрування групи з Web UI / Mac

Сторінки з топіками (CRUD), закріпленнями, учасниками (бан, обмеження, підвищення), посиланнями-запрошеннями,
заявками на вступ, назвою, описом, фото, правами за замовчуванням.

Власник отримує: клон адмінки Telegram у Web UI. Проти: усе це вже є в клієнті Telegram і там зручніше; список учасників
бот усе одно не бачить; потрібні нові вузли UI (поле вводу тексту, список з діями по рядку), бо в контракті вводу тексту
немає (§6.6); кожна дія — небезпечна для чужої спільноти, а MaControl — пульт одного Mac. Корисне з C — лише посилання-
запрошення з терміном і лімітом (кнопка «Запросити на 24 год, 1 раз») — його варто лишити як можливе розширення A.

### Рекомендація

**A + власник у групі**, з інтерфейсом провайдера (§5), який знає лише топіки і відправку. Причини: дає видиму користь
одразу (розкладені сповіщення), бере те, що бот справді вміє, не додає нового рівня auth і не дублює клієнт Telegram.
B — окремим спеком після auth-flow (allow-list — це principal-и, а не налаштування модуля). C — не робити; одне запрошення
з терміном — опцією, якщо власник хоче.

## 5. «Деінде»: шов під другого провайдера

Стан [код]: `agent/src/transports` — реєстр входів у бота (`mac`, `web`, `telegram`) і проксі, без відправки; реєстр
сповіщень — `TelegramNotificationsService` з типом `TelegramNotificationSource`, тобто прив'язаний до Telegram (це вже
записано як борг у module-manifest-developer, «Known debt»). У connection-channels-spec §2 Discord згаданий лише як
майбутній вид `bot`. Коду Slack, Discord, Matrix немає.

**Правило власника (2026-11-25): конектор маніфестує, що він підтримує.** Ядро за замовчуванням підтримує все, що
ми вміємо (топіки, закріплення, запрошення, учасники, команди в групі…): це один повний список можливостей у
`contracts`. Кожен конектор декларує в маніфесті підмножину цього списку, яку він реалізує. Ядро й сторінки нічого не
питають у конектора по ходу: вони читають його маніфест. Чого конектор не задекларував, те видно сірим з причиною
(правило «не ховати, а сірити») і не викликається; виклик незадекларованої можливості — помилка, а не тихий успіх.
Це той самий підхід, що й маніфест модуля: декларація замість імперативних перевірок.

```ts
// contracts: повний список того, що підтримує ядро
export type GroupCapability = 'topics' | 'pins' | 'inviteLinks' | 'members' | 'commands' | 'joinRequests';

// маніфест конектора: що з цього вміє саме він
export const TELEGRAM_GROUPS_MANIFEST: GroupProviderManifest = {
  id: 'telegram',
  title: 'Telegram',
  capabilities: ['topics', 'pins', 'inviteLinks', 'commands'],
  limits: { messagesPerMinute: 20 },
};
```

Найменший нейтральний шов [висновок] (поле `capabilities` нижче — це маніфест із правила вище, а не окремий об'єкт):

```ts
// agent/src/groups/types/group-provider.types.ts
export interface GroupProvider {
  id: GroupProviderId;                 // 'telegram'
  capabilities: GroupCapabilities;     // { topics: boolean }; далі pins, invites
  ensureTopic(dto: EnsureGroupTopicDto): Promise<GroupTopicRef>;
  send(dto: SendGroupMessageDto): Promise<void>;
  leave(dto: LeaveGroupDto): Promise<void>;
}
```

- Ядро модуля (`agent/src/groups/`) володіє таблицями, прив'язкою, маршрутом «джерело → топік» і чергою; про Telegraf не
  знає.
- Адаптер Telegram (`agent/src/telegram/groups/`) реалізує `GroupProvider` поверх уже запущеного `Telegraf` з
  `TelegramBotService` і переводить `my_chat_member` у нейтральні події ядра (`group.added`, `group.removed`,
  `group.rightsChanged`).
- Реєстрація провайдера: коли з'явиться nodes-shim (`agent/src/nest-kit/nodes`, зараз його ще немає [код]) — вузол на
  host `group-providers`; до того — один provider-токен `GROUP_PROVIDERS` з одним елементом. Не будувати другий
  самописний реєстр із `register()` у конструкторі (той самий борг, що в transports і notifications).
- Slack / Discord мають «канали» і «треди», а не топіки; `capabilities` каже, що є, і сторінка показує неможливе сірим з
  причиною. Matrix — кімнати в просторі. Абстракцію під них не розширювати, поки немає реального провайдера.

## 6. Рекомендований обсяг докладно

### 6.1 Флоу прив'язки

1. Власник створює супергрупу, вмикає «Теми» (Topics), додає бота адміном. Права, які просимо:
   `can_manage_topics`, `can_delete_messages` (видалити топік), `can_pin_messages` (не обов'язково). Бот наперед задає їх
   через `setMyDefaultAdministratorRights`, тож Telegram сам підставляє галочки [docs].
2. Приходить `my_chat_member` (бот став `administrator` або `member`). Адаптер дивиться на `update.from.id` — хто додав.
3. Додав **власник** (`from.id === TG_CHAT_ID`): запис групи зі станом `requestedAt`; у приватний чат власнику —
   «Бота додано в «<назва>». Прив'язати для сповіщень?» з кнопками «Прив'язати» / «Вийти з групи».
4. Додав **хтось інший**: `leaveChat` одразу, лічильник `foreignLeft`, сповіщення власнику «Бота додали в чужу групу
   «<назва>» (<user id>), бот вийшов». Запис групи з `leftAt` для журналу, без прив'язки.
5. «Прив'язати» (приватний чат власника, або Mac / локальний Web UI): `boundAt`, `getChat` перевіряє `is_forum`,
   `getChatMember(bot)` — права. Немає топіків чи прав — сторінка показує, чого бракує, сповіщення йдуть у приватний чат.
6. Є все: для кожного увімкненого джерела `createForumTopic(name, icon_color)`, запис топіка.
7. Прив'язана група одна (рішення за замовчуванням, відкрите питання 3). Нова прив'язка — лише після «Відв'язати».

Чому кнопка, а не код з Mac: у контракті UI немає поля вводу тексту [код, `contracts/src/ui.ts`: вузли `section, switch,
select, slider, button, row, status, buttons, list, text, tabs, timer, chart`; налаштування лише `switch | select`,
`contracts/src/modules.ts:31`], а особа того, хто додав бота, Telegram дає сам. Код (`/link <code>`) — запасний варіант,
якщо власник хоче підтвердження саме з Mac.

### 6.2 Маршрут сповіщень

- Налаштування `groups.delivery`: `private` | `group` | `both`, за замовчуванням `private` — після оновлення нічого не
  змінюється, поки власник не прив'яже групу і не вибере `group`.
- Listener сповіщень (`telegram-notifications.listener.ts`) перевіряє перемикач події як зараз, потім питає ядро груп про
  адресат: `{ chatId, threadId? }[]`. Формат повідомлення не змінюється.
- Топік видалили руками (Telegram відповідає помилкою про невідомий thread [висновок, точний текст перевірити]): топік
  `deletedAt`, створюється новий, повідомлення шлеться в нього; не вийшло — у приватний чат (`groups.fallbackPrivate`,
  за замовчуванням увімкнено).
- Топік закрили руками: бот не може писати в закритий топік без `can_manage_topics` [висновок]; маємо право — шлемо,
  не відкриваючи. Стан `closedAt` береться з `forum_topic_closed`.
- Черга на групу: не більше 20 на хвилину, `429` → чекаємо `retry_after`, черга обмежена (наприклад, 50), найстаріші
  падають з лічильником `dropped`. Приватний чат іде своєю чергою, як зараз.
- Джерела `viaMac` (`awake`, `system`) шле скрипт, не агент [код]. У першій ітерації вони лишаються в приватному чаті, а
  на сторінці топіків показані сірим з причиною «шле скрипт Mac». Перенести можна двома шляхами (відкрите питання 4):
  (а) скрипт шле подію агенту, агент — у Telegram; (б) скрипт читає `TG_GROUP_ID` і `TG_THREAD_<source>` з
  `telegram.env` — але тоді Swift `TelegramSettingsStore.save` має навчитися зберігати невідомі ключі, бо зараз він
  перезаписує файл трьома ключами і зітре нові [код].
- Група переїхала (звичайна група стала супергрупою): id чату міняється, приходить `migrate_to_chat_id` [docs,
  `MigrateToChatIdMessage`]. Ядро оновлює `externalId`. Для форуму це не трапляється, бо форум — завжди супергрупа
  [висновок], але обробник дешевий.

### 6.3 Команди в групі (лише власник)

- Middleware замість одного `isOwnerChat`: приватний чат власника — як зараз; прив'язана група — лише якщо
  `from.id === TG_CHAT_ID` і немає `sender_chat`; `my_chat_member` іде в адаптер груп до будь-якої перевірки; решта —
  тиша.
- `setMyCommands` з `BotCommandScopeChat` для прив'язаної групи (той самий список) і з `BotCommandScopeDefault` для
  приватного, щоб чужі групи не бачили меню [docs].
- Кнопки в групі: `from.id` перевіряється на кожному `callback_query`; чужому — `answerCbQuery('Недоступно')`.
- Відповідь бота на команду — в той самий топік, звідки команда (`message_thread_id` з вхідного повідомлення).
- Перемикач `groups.commands` (за замовчуванням вимкнено): чи слухати команди в групі взагалі.

### 6.4 Маніфест (цільова форма з module-manifest-developer)

Ядро нейтральне, тож модуль верхнього рівня, не підмодуль групи `telegram` (відкрите питання 2).

| Частина | Значення |
|---|---|
| `id` | `groups` (префікс налаштувань `groups.*`, namespace бота `groups`) |
| `title` | «Групи» |
| `description` | «Сповіщення агента MaControl по топіках прив'язаної групи. Зараз — Telegram.» |
| `icon` | `{ symbol: 'person.3.fill', tone: 'accent' }` |
| `permissions` | `[]` — Mac нічого не дає |
| Налаштування `GROUPS_UI_SETTINGS` | `delivery` select `private \| group \| both` (default `private`, page `groups`); `fallbackPrivate` switch (default `true`, page `groups`); `commands` switch (default `false`, page `groups`); `topic.<source>` switch на кожне джерело (default `true`, page `groups-topics`) — чи має джерело свій топік, інакше в General |
| Сповіщення `GROUPS_UI_NOTIFICATIONS`, source `groups` | `bindRequested` «Бота додали в групу», `bound` «Групу прив'язано», `foreignLeft` «Бот вийшов з чужої групи», `rightsLost` «У бота забрали права в групі», `removed` «Бота видалили з групи», `deliveryFailed` «Сповіщення не дійшло в групу» (default `false`) |
| Статистика `GROUPS_UI_STATS` | namespace `groups.events`: `sent`, `failed`, `rateLimited`, `dropped`, `foreignLeft`, `topicCreated`; сторінка `groups-stats` з `statsPeriodSetting('groups-stats')` |
| Сторінка `groups` (`@BuildUiPage`, scope `local`) | стан прив'язки (група, `is_forum`, права бота — по рядку з ✓/✗ і що дає кожне), налаштування доставки, кнопки «Прив'язати» (коли є `requestedAt`), «Перевірити права», «Створити топіки», «Відв'язати» |
| Сторінка `groups-topics` (scope `local`) | список джерел: топік, стан (`активний / закритий / видалений / не створено`), перемикач `topic.<source>`, кнопка «Створити заново»; `viaMac`-джерела сірим з причиною |
| Сторінка `groups-stats` (scope `all`) | графіки з `groups.events` |
| Бот `@Bot(MACONTROL_BOT, { namespace: 'groups', command: 'groups', description: '👥 Групи' })` | екран: стан і кнопки як на сторінці `groups`; дії `bind`, `leave`, `unbind`, `checkRights`, `ensureTopics`, `recreateTopic(source)` |
| `status(ctx)` | `{ group: '<назва>' \| null, delivery, topics: <кількість> }` |
| `disabled(ctx)` | «Telegram-бот вимкнено» коли `telegram.bot = false`; модуль сірий, не схований |

Чому `local` для сторінок керування: прив'язка і видалення топіків — дія адміна; через Vercel (`all`) їх не віддаємо, поки
auth-flow не дав principal-ів з правами [висновок, узгоджується з auth-flow-spec].

Дії бота `bind` / `leave` / `unbind` у Telegram приймаються лише з приватного чату власника, не з групи.

### 6.5 Сутності і стан

SQLite через `@nest-kit/sqlite`, одна міграція `2026-11-2x-008-groups.migration.ts` у `agent/src/database/migrations/`.
Стан — nullable timestamp, похідні bool лише у відповіді.

```ts
@Entity('group_chats')
export class GroupChatEntity {
  @PrimaryGeneratedColumn() id!: number;
  @Column({ type: 'text' }) provider!: GroupProviderId;        // 'telegram'
  @Column({ type: 'text' }) externalId!: string;               // -100…, текстом
  @Column({ type: 'text' }) title!: string;
  @Column({ type: 'text' }) addedBy!: string;                  // user id того, хто додав
  @Column({ type: 'json' }) botRights!: GroupBotRights;        // знімок прав з my_chat_member / getChatMember
  @StateDateColumn() topicsEnabledAt!: string | null;          // бачили is_forum = true
  @StateDateColumn() requestedAt!: string | null;              // додав власник, чекає підтвердження
  @StateDateColumn() boundAt!: string | null;
  @StateDateColumn() leftAt!: string | null;                   // бот вийшов або його видалили
  @CreateDateColumn() createdAt!: string;
  @UpdateDateColumn() updatedAt!: string | null;
  @DeleteDateColumn() deletedAt!: string | null;               // відв'язали
}

@Entity('group_topics')
export class GroupTopicEntity {
  @PrimaryGeneratedColumn() id!: number;
  @Column({ type: 'integer' }) groupId!: number;
  @Column({ type: 'integer' }) threadId!: number;              // message_thread_id
  @Column({ type: 'text' }) source!: string;                   // id джерела сповіщень
  @Column({ type: 'text' }) name!: string;
  @StateDateColumn() closedAt!: string | null;
  @CreateDateColumn() createdAt!: string;
  @DeleteDateColumn() deletedAt!: string | null;               // видалили в Telegram або ми
}
```

DTO / query класи (без inline-типів): `CreateGroupChatDto`, `UpdateGroupChatStateDto`, `FindOneGroupChatQuery`
(`provider`, `externalId`), `FindBoundGroupChatQuery`, `SaveGroupTopicDto`, `FindOneGroupTopicQuery` (`groupId`,
`source`), `FindManyGroupTopicsQuery`; провайдерні `EnsureGroupTopicDto`, `SendGroupMessageDto`, `LeaveGroupDto`.
Пошук «прив'язана» — `boundAt: Not(IsNull())`, `leftAt: IsNull()` через find-оператори, без сирого SQL.

Кеш у пам'яті: прив'язана група і мапа `source → threadId` читаються на кожне сповіщення — тримати в сервісі ядра,
інвалідувати на запис [висновок].

### 6.6 Які файли змінюються

| Файл | Зміна |
|---|---|
| `agent/src/telegram/services/telegram-bot/telegram-bot.service.ts` | middleware за §6.3; явний `allowedUpdates: ['message', 'callback_query', 'my_chat_member']` у `launch`; `notify` з адресатом (`chatId`, `threadId`); обробник `my_chat_member` → адаптер; `setMyCommands` зі scope; доступ адаптера до `bot.telegram` без витоку токена |
| `…/helpers/is-owner-chat.ts` | розділити на `isOwnerUser(from, ownerId)` і перевірку чату; старий виклик лишається для приватного чату |
| `…/telegram-notifications.listener.ts` | адресати з ядра груп; черга на групу під ліміт |
| `agent/src/telegram/telegram.module.ts` | провайдер адаптера груп |
| нове `agent/src/groups/` | `groups.module.ts`, `groups.ui-provider.ts` (маніфест), `groups.bot.ts`, `entities/`, `dto/`, `query/`, `repositories/`, `services/`, `constants/groups-settings.ts`, `constants/groups-notifications.ts`, `constants/groups-stats.ts`, `pages/` |
| нове `agent/src/telegram/groups/` | `TelegramGroupProvider` |
| `agent/src/modules/modules.module.ts` | реєстрація модуля (поки `MAC_MODULES` — у обох списках) |
| `agent/src/database/migrations/index.ts` + новий файл міграції | дві таблиці |
| `contracts/` | нічого (вузли й налаштування існуючі) |
| Swift, `Resources/awake` | нічого в першій ітерації; лише якщо власник вибере шлях (б) у §6.2 |

### 6.7 Секрети

Нових секретів немає. Токен бота і `TG_CHAT_ID` лишаються в `~/.config/awake/telegram.env` (Mac-only). Id групи і
топіків — не секрет, лежать у SQLite. Посилання-запрошення (якщо колись) — секрет за змістом: не логувати, не віддавати
на `all` scope [висновок]. `describeError(error, token)` уже маскує токен у логах [код] — нові виклики через нього ж.

### 6.8 Безпека

- **Хто може адмін-дії** (прив'язати, відв'язати, створити / видалити топіки): Mac (`mac`), локальний Web UI (`local`),
  приватний чат власника. Не з групи і не через Vercel.
- **Бота додали в чужу групу**: вихід одразу, сповіщення власнику, запис з `leftAt`. Будь-хто, хто знає @username бота,
  може його додати — це штатна поведінка Telegram, без вихідного тексту в чужу групу (жодного «привіт» туди) [висновок].
  Варто ще вимкнути в BotFather «Allow Groups» поза моментом прив'язки — це налаштування BotFather, не API (у 10.5 є
  `setMySettings`, але typings його не мають) [docs + висновок].
- **Бот у прив'язаній групі бачить усе** (адмін): модуль обробляє лише команди від власника і службові події, текст
  учасників не пише ні в журнал, ні в статистику.
- **Анонімні адміни і повідомлення від імені каналу** (`sender_chat`): ідентифікувати неможливо — відмова.
- **Кнопки**: перевірка `from.id` на кожному натисканні.
- **Власник забрав у бота права** (`my_chat_member` з новими правами): `rightsLost`, доставка падає в приватний чат.
- **Ліміти**: 20/хв на групу, `429 retry_after`, обмежена черга; повтор не частіше, ніж каже Telegram. Створення топіків
  на прив'язці — послідовно, з паузою (≈6 джерел, вкладаємось) [висновок].
- **Журнал**: дії модуля йдуть через `ModulesService.dispatch` з `source: 'telegram'` або `mac` / `web`, як усі [код];
  user id виконавця в журнал поки не пишемо (це частина B / auth-flow).

## 7. Відкриті питання власнику

1. **Група чи топіки в приватному чаті з ботом?** Bot API 9.4 дозволяє боту створювати топіки прямо в приватному чаті
   [docs] — без групи, без адмін-прав, без ризику чужої групи; але потрібен виклик поза typings Telegraf (`callApi`) або
   інша бібліотека, і це не дасть додати другу людину. *Пропоную:* група (як просили), а приватні топіки — окремим
   маленьким кроком пізніше, якщо сподобається.
2. **Модуль верхнього рівня «Групи» чи підмодуль у групі `telegram`?** *Пропоную:* верхній рівень `groups`, бо ядро
   нейтральне; у групі `telegram` — лише посилання на нього.
3. **Одна прив'язана група чи кілька** (наприклад, одна на кожен Mac або «робоча / особиста»)? *Пропоную:* одна; таблиця
   вже дозволяє кілька, обмеження — в сервісі.
4. **Події скрипта (`awake`, `system`) у топіки**: (а) скрипт шле подію агенту, агент — у Telegram (одне місце
   відправки, але без агента ці події пропадуть); (б) скрипт сам шле в топік за `telegram.env` (працює без агента, але
   треба виправити Swift `save`, щоб не стирав ключі). *Пропоную:* у першій ітерації лишити їх у приватному чаті; потім (а)
   з резервом «агент не відповів → скрипт шле в приватний чат».
5. **Команди в групі** — лише власник (§6.3) чи одразу allow-list (обсяг B)? *Пропоную:* лише власник; allow-list —
   окремий спек після auth-flow.
6. **Підтвердження прив'язки** — кнопкою в приватному чаті (особу дає Telegram) чи кодом з Mac? *Пропоную:* кнопка;
   код — лише якщо хочете, щоб без Mac прив'язати було неможливо.
7. **Оновити Telegraf / перейти на grammY?** Typings 4.16.3 — Bot API 7.1; для всього в рекомендованому обсязі цього
   досить [docs]. *Пропоную:* не чіпати зараз; повернутись, якщо візьмемо пункт 1 чи `setMySettings`.
8. **Запрошення з терміном** (з обсягу C): кнопка «Запросити: 24 год, 1 людина» на сторінці `groups`? *Пропоную:* ні в
   першій ітерації.
9. **Другий провайдер** (Slack, Discord, Matrix): є конкретний, яким ви користуєтесь? *Пропоную:* ні — лишаємо тільки
   інтерфейс `GroupProvider` з одним Telegram.
