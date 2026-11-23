/// Сторінки головного вікна. `.remote` — сторінка дерева від агента, решту малює сам застосунок.
enum MainPage: Hashable, Identifiable {
    case remote(id: String)
    /// Вимкнений модуль дерева: сірий пункт без сторінки, вибрати його не можна.
    case disabledModule(id: String)
    case permission
    case connection
    case devices
    case server
    /// «Сервер → Статистика»: навантаження й запити графіками, окремо від стану сервера.
    case serverStats

    var id: MainPage { self }

    /// Рядок для UserDefaults: вибрана сторінка переживає перезапуск аппки.
    var storageKey: String {
        switch self {
        case .remote(let id): "remote:\(id)"
        case .disabledModule(let id): "module:\(id)"
        case .permission: "permission"
        case .connection: "connection"
        case .devices: "devices"
        case .server: "server"
        case .serverStats: "server.stats"
        }
    }

    init?(storageKey: String) {
        switch storageKey {
        case "permission": self = .permission
        case "connection": self = .connection
        case "devices": self = .devices
        case "server": self = .server
        case "server.stats": self = .serverStats
        default:
            guard storageKey.hasPrefix("remote:") else { return nil }
            self = .remote(id: String(storageKey.dropFirst("remote:".count)))
        }
    }
}
