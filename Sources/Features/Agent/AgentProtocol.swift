import Foundation

/// Стан Mac і сесій від сервера. Поля — з `MacState` у contracts/src/index.ts; аппка бере лише те, що показує.
struct ServerMacState: Decodable, Equatable {
    var active: Bool
    var until: Date?
    var startedAt: Date?
    var battery: Int?
    var power: String
    var thermal: String
    var sleepBlocked: Bool
    var sleepAt: Date?
}

/// Дозволи від сервера: що видано в системі і що вимкнено окремим модулям. Аппка їх лише показує.
struct ServerPermissions: Decodable, Equatable {
    struct Denied: Decodable, Equatable { let module: String; let permission: String }
    var granted: [String]
    var denied: [Denied]
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

    /// Рядок від агента. Типи, які аппка не обробляє, дає як `.other`.
    enum Incoming {
        case ready(port: Int)
        case state(ServerMacState)
        case permissions(ServerPermissions)
        case tree(UiTree)
        case settings([String: UiScalar])
        case devices(AgentDevices)
        case secrets(AgentSecrets)
        case trustedNetworks([String])
        case webhooks([AgentWebhook])
        case server(AgentServerInfo)
        case serverCharts(AgentServerCharts)
        case serverChartsTick(AgentServerChartsTick)
        case chartTick(UiChartTick)
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
        case "state":
            struct Wrapper: Decodable { let data: ServerMacState }
            guard let state = try? UiTreeDecoder.decoder.decode(Wrapper.self, from: data).data else { return .other }
            return .state(state)
        case "permissions":
            struct Wrapper: Decodable { let data: ServerPermissions }
            guard let permissions = try? JSONDecoder().decode(Wrapper.self, from: data).data else { return .other }
            return .permissions(permissions)
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
        case "serverCharts":
            struct Wrapper: Decodable { let data: AgentServerCharts }
            guard let charts = try? UiTreeDecoder.decoder.decode(Wrapper.self, from: data).data else { return .other }
            return .serverCharts(charts)
        case "serverChartsTick":
            struct Wrapper: Decodable { let data: AgentServerChartsTick }
            guard let tick = try? UiTreeDecoder.decoder.decode(Wrapper.self, from: data).data else { return .other }
            return .serverChartsTick(tick)
        case "chartTick":
            struct Wrapper: Decodable { let data: UiChartTick }
            guard let tick = try? UiTreeDecoder.decoder.decode(Wrapper.self, from: data).data else { return .other }
            return .chartTick(tick)
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
