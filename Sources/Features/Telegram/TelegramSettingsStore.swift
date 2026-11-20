import Foundation

struct TelegramSettings: Equatable {
    var token = ""
    var chatId = ""
    /// Які події слати в Telegram. За замовчуванням усі.
    var events = Set(TelegramEvent.allCases)

    var isConfigured: Bool { !token.isEmpty && !chatId.isEmpty }

    /// Токен для показу: лише останні 4 символи.
    var maskedToken: String {
        guard token.count > 4 else { return String(repeating: "•", count: token.count) }
        return "••••" + token.suffix(4)
    }
}

/// Файл ~/.config/awake/telegram.env, який читає скрипт. Права 600.
enum TelegramSettingsStore {
    enum StoreError: LocalizedError {
        case invalidCharacter
        var errorDescription: String? { "недопустимий символ ' у налаштуваннях" }
    }

    static let url = FileManager.default.homeDirectoryForCurrentUser
        .appendingPathComponent(".config/awake/telegram.env")

    static func load() -> TelegramSettings {
        var settings = TelegramSettings()
        guard let text = try? String(contentsOf: url, encoding: .utf8) else { return settings }
        for line in text.split(separator: "\n") {
            let parts = line.split(separator: "=", maxSplits: 1).map(String.init)
            guard parts.count == 2 else { continue }
            let value = parts[1].trimmingCharacters(in: CharacterSet(charactersIn: "'\" "))
            switch parts[0] {
            case "TG_BOT_TOKEN": settings.token = value
            case "TG_CHAT_ID": settings.chatId = value
            case "TG_EVENTS":
                let names = Set(value.split(separator: ",").map(String.init))
                settings.events = Set(names.compactMap(TelegramEvent.find))
            default: break
            }
        }
        return settings
    }

    static func save(_ settings: TelegramSettings) throws {
        let token = settings.token.trimmingCharacters(in: .whitespacesAndNewlines)
        let chat = settings.chatId.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !token.contains("'"), !chat.contains("'") else { throw StoreError.invalidCharacter }

        let events = TelegramEvent.allCases.filter(settings.events.contains).map(\.rawValue).joined(separator: ",")
        let body = "# Налаштування Telegram для awake\nTG_BOT_TOKEN='\(token)'\nTG_CHAT_ID='\(chat)'\nTG_EVENTS='\(events)'\n"
        try FileManager.default.createDirectory(at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
        try body.write(to: url, atomically: true, encoding: .utf8)
        try FileManager.default.setAttributes([.posixPermissions: 0o600], ofItemAtPath: url.path)
    }
}
