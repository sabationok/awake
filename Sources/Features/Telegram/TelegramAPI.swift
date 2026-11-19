import Foundation

/// Мінімальний клієнт Bot API: надіслати повідомлення і забрати оновлення.
struct TelegramAPI {
    let token: String

    struct Update: Decodable {
        let updateId: Int
        let message: Message?
        let callbackQuery: CallbackQuery?
        enum CodingKeys: String, CodingKey {
            case updateId = "update_id", message
            case callbackQuery = "callback_query"
        }
    }
    /// Натиснута кнопка під повідомленням бота. `message` — повідомлення, під яким була кнопка.
    struct CallbackQuery: Decodable {
        let id: String
        let data: String?
        let message: Message?
    }
    struct Message: Decodable {
        let chat: Chat
        let text: String?
        /// Unix-час відправлення, за ним відсіюємо команди, надіслані поки слухач не працював.
        let date: Int
    }
    struct Chat: Decodable {
        let id: Int64
    }
    private struct Response<T: Decodable>: Decodable {
        let ok: Bool
        let result: T?
        let description: String?
    }
    struct APIError: LocalizedError {
        let message: String
        var errorDescription: String? { message }
    }

    /// Довге опитування: сервер тримає з'єднання до `timeout` секунд.
    func getUpdates(offset: Int, timeout: Int) async throws -> [Update] {
        try await call("getUpdates", [
            "offset": String(offset),
            "timeout": String(timeout),
            "allowed_updates": #"["message","callback_query"]"#,
        ])
    }

    /// Меню команд, яке Telegram показує за кнопкою «/».
    func setMyCommands(_ commands: [(String, String)]) async throws {
        let items = commands.map { #"{"command":"\#($0.0)","description":"\#($0.1)"}"# }
        let _: Bool = try await call("setMyCommands", ["commands": "[\(items.joined(separator: ","))]"])
    }

    /// Повідомлення з HTML і, за потреби, кнопками під ним.
    func send(chatId: String, html: String, keyboard: [[TelegramButton]] = []) async throws {
        var params = ["chat_id": chatId, "parse_mode": "HTML", "text": html]
        if !keyboard.isEmpty { params["reply_markup"] = Self.markup(keyboard) }
        let _: Bool = try await call("sendMessage", params)
    }

    /// Підтверджує натискання кнопки. Без цього в Telegram крутиться індикатор.
    func answerCallbackQuery(id: String, text: String?) async throws {
        var params = ["callback_query_id": id]
        if let text { params["text"] = text }
        let _: Bool = try await call("answerCallbackQuery", params)
    }

    private static func markup(_ rows: [[TelegramButton]]) -> String {
        let encoded = rows.map { row in
            "[" + row.map { #"{"text":"\#($0.text)","callback_data":"\#($0.data)"}"# }.joined(separator: ",") + "]"
        }
        return #"{"inline_keyboard":[\#(encoded.joined(separator: ","))]}"#
    }

    private func call<T: Decodable>(_ method: String, _ params: [String: String]) async throws -> T {
        var request = URLRequest(url: URL(string: "https://api.telegram.org/bot\(token)/\(method)")!)
        request.httpMethod = "POST"
        request.setValue("application/x-www-form-urlencoded", forHTTPHeaderField: "Content-Type")
        var body = URLComponents()
        body.queryItems = params.map { URLQueryItem(name: $0.key, value: $0.value) }
        request.httpBody = body.percentEncodedQuery?.data(using: .utf8)
        request.timeoutInterval = 60

        let (data, _) = try await URLSession.shared.data(for: request)
        let response = try JSONDecoder().decode(Response<T>.self, from: data)
        guard response.ok, let result = response.result else {
            throw APIError(message: response.description ?? "невідома помилка Telegram")
        }
        return result
    }
}

struct TelegramButton: Equatable {
    let text: String
    /// Що прийде боту, коли натиснуто. До 64 байт, без пробілів.
    let data: String
}

/// Що бот відповість на вхід: текст з кнопками і, окремо, короткий напис для натиснутої кнопки.
struct TelegramOutput {
    var html: String?
    var keyboard: [[TelegramButton]] = []
    var callbackAnswer: String?

    static func text(_ html: String?) -> TelegramOutput { TelegramOutput(html: html) }
}

/// Той самий формат, що й у скрипті `awake`: назва мака, заголовок, JSON у <pre>.
enum TelegramMessage {
    static func format(title: String, fields: [(String, Any)]) -> String {
        let host = Host.current().localizedName ?? "Mac"
        var text = "💻 <b>\(escape(host))</b>\n\(escape(title))"
        if !fields.isEmpty {
            let lines = fields.map { "  \"\($0.0)\": \(json($0.1))" }
            text += "\n<pre>{\n\(lines.joined(separator: ",\n"))\n}</pre>"
        }
        return text
    }

    private static func json(_ value: Any) -> String {
        switch value {
        case let n as Int: return String(n)
        case let b as Bool: return b ? "true" : "false"
        case let s as String: return "\"\(escape(s.replacingOccurrences(of: "\"", with: "\\\"")))\""
        default: return "null"
        }
    }

    private static func escape(_ s: String) -> String {
        s.replacingOccurrences(of: "&", with: "&amp;")
            .replacingOccurrences(of: "<", with: "&lt;")
            .replacingOccurrences(of: ">", with: "&gt;")
    }
}
