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
    var trusted: Bool
    var appVersion: String
}

/// Команда від агента: що натиснули на пульті.
struct AgentCommand: Decodable {
    enum Action: String, Decodable { case start, stop, lock, displayOff }
    var id: String
    var action: Action
    var duration: String?
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

    /// Рядок від агента. Цікавлять лише ready і command.
    static func parse(_ line: String) -> (type: String, command: AgentCommand?, port: Int?)? {
        struct Ready: Decodable { let port: Int }
        struct Incoming: Decodable { let type: String }
        guard let data = line.data(using: .utf8),
              let incoming = try? JSONDecoder().decode(Incoming.self, from: data) else { return nil }
        switch incoming.type {
        case "command":
            struct Wrapper: Decodable { let data: AgentCommand }
            return (incoming.type, try? JSONDecoder().decode(Wrapper.self, from: data).data, nil)
        case "ready":
            struct Wrapper: Decodable { let data: Ready }
            return (incoming.type, nil, try? JSONDecoder().decode(Wrapper.self, from: data).data.port)
        default:
            return (incoming.type, nil, nil)
        }
    }
}
