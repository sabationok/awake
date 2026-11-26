/// Сторінки головного вікна. `.remote` — сторінка дерева від агента, решту малює сам застосунок.
enum MainPage: Hashable, Identifiable {
    case remote(id: String)
    /// Вимкнений модуль дерева: сірий пункт без сторінки, вибрати його не можна.
    case disabledModule(id: String)
    case connection
    case server
    /// «Сервер → Статистика»: навантаження й запити графіками, окремо від стану сервера.
    case serverStats

    var id: MainPage { self }

    /// Рядок для UserDefaults: вибрана сторінка переживає перезапуск аппки.
    var storageKey: String {
        switch self {
        case .remote(let id): "remote:\(id)"
        case .disabledModule(let id): "module:\(id)"
        case .connection: "connection"
        case .server: "server"
        case .serverStats: "server.stats"
        }
    }

    init?(storageKey: String) {
        switch storageKey {
        // Рідної сторінки «Дозвіл» більше немає: її замінила серверна «Дозволи».
        case "permission": self = .remote(id: "permissions")
        case "connection": self = .connection
        // Рідної сторінки «Пристрої» більше немає: вона стала сторінкою модуля «Web UI».
        case "devices": self = .remote(id: "webui-devices")
        case "server": self = .server
        case "server.stats": self = .serverStats
        default:
            guard storageKey.hasPrefix("remote:") else { return nil }
            self = .remote(id: String(storageKey.dropFirst("remote:".count)))
        }
    }
}
