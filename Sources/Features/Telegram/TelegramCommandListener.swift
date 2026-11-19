import AppKit
import Foundation

/// Вхід від бота: текстова команда або натиснута кнопка.
enum TelegramInput: Equatable {
    case text(String)
    case action(String)
}

/// Слухає бота довгим опитуванням, поки аппка запущена.
/// Приймає лише повідомлення і кнопки з чату, що збігається з Chat ID у налаштуваннях.
@MainActor
final class TelegramCommandListener {
    enum Status: Equatable {
        case stopped
        case listening
        case failed(String)
    }

    typealias Handler = @MainActor (TelegramInput) async -> TelegramOutput

    private(set) var status: Status = .stopped { didSet { onStatus?(status) } }
    var onStatus: ((Status) -> Void)?

    private var task: Task<Void, Never>?
    private var sleepObservers: [NSObjectProtocol] = []
    /// Виконуємо лише команди, надіслані після цього моменту. Зсувається при старті
    /// і при кожному пробудженні мака: усе, що прийшло у сні, ігнорується.
    private var acceptSince = 0
    private static let offsetKey = "telegram.updateOffset"
    private static let stoppedAtKey = "telegram.stoppedAt"
    /// Скільки команд пропущено під час останнього старту.
    var onSkipped: ((Int) -> Void)?

    static let commands: [(String, String)] = [
        ("awake", "Кнопки керування Awake"),
        ("status", "Стан сесії, батарея, температура"),
        ("start", "Заблокувати сон на збережену тривалість; /start 2h — разово"),
        ("duration", "Тривалість за замовчуванням: /duration 4h"),
        ("stop", "Повернути сон"),
        ("lock", "Заблокувати екран і погасити його"),
        ("screen", "Лише погасити екран"),
        ("quit", "Вийти з аппки, сон повернеться"),
    ]

    func start(settings: TelegramSettings, handler: @escaping Handler) {
        stop()
        guard settings.isConfigured else { return }
        acceptSince = Self.now()
        observeSleep()
        task = Task { [weak self] in await self?.loop(settings, handler) }
    }

    func stop() {
        guard task != nil else { return }
        task?.cancel()
        task = nil
        status = .stopped
        Self.markStopped()
        sleepObservers.forEach { NSWorkspace.shared.notificationCenter.removeObserver($0) }
        sleepObservers = []
    }

    private static func now() -> Int { Int(Date().timeIntervalSince1970) }

    private static func markStopped() {
        UserDefaults.standard.set(Date().timeIntervalSince1970, forKey: stoppedAtKey)
    }

    /// Сон мака: записуємо час, після пробудження приймаємо лише нові команди.
    private func observeSleep() {
        let center = NSWorkspace.shared.notificationCenter
        sleepObservers = [
            center.addObserver(forName: NSWorkspace.willSleepNotification, object: nil, queue: .main) { _ in
                Self.markStopped()
            },
            center.addObserver(forName: NSWorkspace.didWakeNotification, object: nil, queue: .main) { [weak self] _ in
                MainActor.assumeIsolated { self?.acceptSince = Self.now() }
            },
        ]
    }

    /// Коли слухач востаннє працював. Команди, надіслані раніше, не виконуються.
    static var stoppedAt: Date? {
        let t = UserDefaults.standard.double(forKey: stoppedAtKey)
        return t > 0 ? Date(timeIntervalSince1970: t) : nil
    }

    private func loop(_ settings: TelegramSettings, _ handler: Handler) async {
        let api = TelegramAPI(token: settings.token)
        let defaults = UserDefaults.standard
        var offset = defaults.integer(forKey: Self.offsetKey)
        var skipped = 0
        try? await api.setMyCommands(Self.commands)

        while !Task.isCancelled {
            do {
                let updates = try await api.getUpdates(offset: offset, timeout: 25)
                if status != .listening { status = .listening }
                for update in updates {
                    offset = update.updateId + 1
                    defaults.set(offset, forKey: Self.offsetKey)
                    if let query = update.callbackQuery {
                        await handleButton(query, api: api, settings: settings, handler: handler, skipped: &skipped)
                    } else {
                        await handleMessage(update.message, api: api, settings: settings, handler: handler, skipped: &skipped)
                    }
                }
                if skipped > 0 { onSkipped?(skipped); skipped = 0 }
            } catch is CancellationError {
                break
            } catch {
                if Task.isCancelled { break }
                status = .failed(error.localizedDescription)
                try? await Task.sleep(for: .seconds(5))
            }
        }
    }

    private func handleMessage(_ message: TelegramAPI.Message?, api: TelegramAPI, settings: TelegramSettings,
                               handler: Handler, skipped: inout Int) async {
        guard let message, String(message.chat.id) == settings.chatId, let text = message.text else { return }
        if message.date < acceptSince {
            skipped += 1
            return
        }
        let output = await handler(.text(text))
        if let html = output.html {
            try? await api.send(chatId: settings.chatId, html: html, keyboard: output.keyboard)
        }
    }

    /// Кнопка діє лише з повідомлення, надісланого після пробудження: часу натискання Telegram не дає.
    private func handleButton(_ query: TelegramAPI.CallbackQuery, api: TelegramAPI, settings: TelegramSettings,
                              handler: Handler, skipped: inout Int) async {
        guard let message = query.message, String(message.chat.id) == settings.chatId, let data = query.data else {
            try? await api.answerCallbackQuery(id: query.id, text: nil)
            return
        }
        if message.date < acceptSince {
            skipped += 1
            try? await api.answerCallbackQuery(id: query.id, text: "Кнопка застаріла, надішли /awake ще раз")
            return
        }
        let output = await handler(.action(data))
        try? await api.answerCallbackQuery(id: query.id, text: output.callbackAnswer)
        if let html = output.html {
            try? await api.send(chatId: settings.chatId, html: html, keyboard: output.keyboard)
        }
    }
}
