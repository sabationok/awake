/** Скільки сповіщень чекає в черзі групи; понад це найстаріше падає з лічильником. */
export const GROUP_QUEUE_LIMIT = 50;

/** Вікно ліміту `messagesPerMinute`. */
export const GROUP_RATE_WINDOW_MS = 60_000;

/** Спроб на одне сповіщення: перша, після `429 retry_after`, після нового топіка. */
export const GROUP_SEND_ATTEMPTS = 3;

/** Найдовше, що черга чекає на прохання Telegram (`429 retry_after`); довше — сповіщення йде запасним шляхом. */
export const GROUP_RETRY_AFTER_CAP_MS = 60_000;

/** Скільки сповіщення може чекати в черзі групи; старіше вже не шлеться в групу, а йде запасним шляхом. */
export const GROUP_QUEUE_TTL_MS = 120_000;

/** Файл із групою і топіками для скрипта Mac (`Resources/awake`), поруч із telegram.env. Секретів у ньому немає. */
export const TELEGRAM_TOPICS_ENV_FILE = 'telegram-topics.env';
