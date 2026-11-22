import Foundation

/// Знімок стану для агента. Поля збігаються з `MacState` у contracts/src/index.ts.
struct AgentMacState: Encodable, Equatable {
    var host: String
    var active: Bool
    var until: Date?
    var startedAt: Date?
    var duration: String?
    var battery: Int?
    var power: String
    var thermal: String
    var lidClosed: Bool
    var sleepBlocked: Bool
    var ssid: String?
    var appVersion: String
    /// Сесія таймера сну: коли поставили і коли Mac засне.
    var sleepStartedAt: Date?
    var sleepAt: Date?
    var volume: Int?
    var muted: Bool
    var brightness: Int?
}

/// Команда від агента: що натиснули на пульті або яке налаштування змінили.
struct AgentCommand: Decodable {
    enum Action: String, Decodable { case start, stop, lock, displayOff, setting, sleepTimer, volume, mute, brightness }
    var id: String
    var action: Action
    var duration: String?
    /// Для setting: ключ `<module>.<key>` і нове значення.
    var key: String?
    var value: UiScalar?
    /// Звідки прийшла дія: мак, Telegram чи веб. Без поля лишається веб.
    var source: SessionSource?
}

enum AgentProtocol {
    static let encoder: JSONEncoder = {
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        return encoder
    }()

    /// Один рядок протоколу: `{"type": ..., "data": ...}` і перенос рядка.
    private struct Envelope<D: Encodable>: Encodable {
        let type: String
        let data: D
    }

    static func line<T: Encodable>(type: String, data: T) -> Data? {
        guard var data = try? encoder.encode(Envelope(type: type, data: data)) else { return nil }
        data.append(0x0A)
        return data
    }

    struct LogLine: Encodable { let at: Date; let text: String }

    struct SessionEvent: Encodable {
        let event: String
        let at: Date
        let source: String
        let duration: String?
        let battery: Int?
        let reason: String?
    }

    /// Подія сесії таймера сну: start або stop з причиною. `silent` — агент не шле її в Telegram.
    struct SleepTimerEvent: Encodable {
        let event: String
        let at: Date
        let startedAt: Date
        let sleepAt: Date
        let minutes: Int
        let source: String
        let reason: String?
        let silent: Bool
    }

    /// Рядок від агента. Типи, які аппка не обробляє, дає як `.other`.
    enum Incoming {
        case ready(port: Int)
        case command(AgentCommand)
        case tree(UiTree)
        case settings([String: UiScalar])
        case devices(AgentDevices)
        case secrets(AgentSecrets)
        case trustedNetworks([String])
        case webhooks([AgentWebhook])
        case server(AgentServerInfo)
        case other
    }

    static func parse(_ line: String) -> Incoming? {
        struct Header: Decodable { let type: String }
        guard let data = line.data(using: .utf8),
              let header = try? JSONDecoder().decode(Header.self, from: data) else { return nil }
        switch header.type {
        case "ready":
            struct Ready: Decodable { let port: Int }
            struct Wrapper: Decodable { let data: Ready }
            guard let port = try? JSONDecoder().decode(Wrapper.self, from: data).data.port else { return .other }
            return .ready(port: port)
        case "command":
            struct Wrapper: Decodable { let data: AgentCommand }
            guard let command = try? JSONDecoder().decode(Wrapper.self, from: data).data else { return .other }
            return .command(command)
        case "tree":
            // Дерево містить ISO-дати з мілісекундами, тож декодер свій, як у UiTreeDecoder.
            struct Wrapper: Decodable { let data: UiTree }
            guard let tree = try? UiTreeDecoder.decoder.decode(Wrapper.self, from: data).data else { return .other }
            return .tree(tree)
        case "settings":
            struct Wrapper: Decodable { let data: [String: UiScalar] }
            guard let settings = try? JSONDecoder().decode(Wrapper.self, from: data).data else { return .other }
            return .settings(settings)
        case "devices":
            struct Wrapper: Decodable { let data: AgentDevices }
            guard let devices = try? UiTreeDecoder.decoder.decode(Wrapper.self, from: data).data else { return .other }
            return .devices(devices)
        case "trustedNetworks":
            struct Networks: Decodable { let ssids: [String] }
            struct Wrapper: Decodable { let data: Networks }
            guard let ssids = try? JSONDecoder().decode(Wrapper.self, from: data).data.ssids else { return .other }
            return .trustedNetworks(ssids)
        case "server":
            struct Wrapper: Decodable { let data: AgentServerInfo }
            guard let info = try? UiTreeDecoder.decoder.decode(Wrapper.self, from: data).data else { return .other }
            return .server(info)
        case "webhooks":
            struct List: Decodable { let webhooks: [AgentWebhook] }
            struct Wrapper: Decodable { let data: List }
            guard let webhooks = try? UiTreeDecoder.decoder.decode(Wrapper.self, from: data).data.webhooks else { return .other }
            return .webhooks(webhooks)
        case "secrets":
            struct Wrapper: Decodable { let data: AgentSecrets }
            guard let secrets = try? UiTreeDecoder.decoder.decode(Wrapper.self, from: data).data else { return .other }
            return .secrets(secrets)
        default:
            return .other
        }
    }
}
