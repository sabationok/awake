import Foundation

/// Вебхук webhooxy з SQLite агента. Поля збігаються з `WebhookInfo` у contracts; секретів тут немає.
struct AgentWebhook: Decodable, Equatable, Identifiable {
    enum Kind: String, Codable, CaseIterable, Identifiable {
        case relay, envify, links
        var id: String { rawValue }

        var title: String {
            switch self {
            case .relay: "Relay"
            case .envify: "Envify"
            case .links: "Разові посилання"
            }
        }

        var symbol: String {
            switch self {
            case .relay: "antenna.radiowaves.left.and.right"
            case .envify: "key.horizontal.fill"
            case .links: "link"
            }
        }

        /// Хто надсилає в такий вебхук.
        var provider: Provider { self == .envify ? .envify : .macontrol }
    }

    enum Provider: String, Codable, CaseIterable, Identifiable {
        case macontrol, envify
        var id: String { rawValue }
    }

    enum Mode: String, Codable, CaseIterable, Identifiable {
        case stream, oneshot
        var id: String { rawValue }
    }

    struct Config: Codable, Equatable {
        var room: String?
    }

    let id: Int
    let whId: String
    let provider: Provider
    let type: Kind
    let mode: Mode
    let workspace: String
    let destId: String
    let config: Config
    let createdAt: Date
    let updatedAt: Date?
    let disabledAt: Date?
    /// Лише в relay: online | connecting | offline | off | unconfigured.
    let status: String?
    /// Графіки подій за вибраний на «Вебхуках» період; вебхук без жодної події — без графіків.
    let charts: [UiChart]

    var isEnabled: Bool { disabledAt == nil }
}

/// Форма з модалки. Без `id` — новий вебхук; порожній `whId` агент згенерує сам.
struct WebhookInput: Encodable, Equatable {
    var id: Int?
    var whId = ""
    var provider = AgentWebhook.Provider.macontrol
    var type = AgentWebhook.Kind.relay
    var mode = AgentWebhook.Mode.stream
    var workspace = ""
    var destId = ""
    var room = ""

    init() {}

    init(_ webhook: AgentWebhook) {
        id = webhook.id
        whId = webhook.whId
        provider = webhook.provider
        type = webhook.type
        mode = webhook.mode
        workspace = webhook.workspace
        destId = webhook.destId
        room = webhook.config.room ?? ""
    }

    /// Кімната потрібна лише relay: без неї агент не перевірить квиток viewer-а.
    var isValid: Bool { !workspace.isEmpty && !destId.isEmpty && (type != .relay || !room.isEmpty) }

    private enum CodingKeys: String, CodingKey { case id, whId, provider, type, mode, workspace, destId, config }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encodeIfPresent(id, forKey: .id)
        if !whId.isEmpty { try container.encode(whId, forKey: .whId) }
        try container.encode(provider, forKey: .provider)
        try container.encode(type, forKey: .type)
        try container.encode(mode, forKey: .mode)
        try container.encode(workspace.trimmingCharacters(in: .whitespaces), forKey: .workspace)
        try container.encode(destId.trimmingCharacters(in: .whitespaces), forKey: .destId)
        try container.encode(AgentWebhook.Config(room: type == .relay ? room.trimmingCharacters(in: .whitespaces) : nil), forKey: .config)
    }
}
