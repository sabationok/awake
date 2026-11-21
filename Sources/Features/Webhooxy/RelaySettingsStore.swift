import Foundation

/// Ключі webhooxy з ~/.config/awake/relay.env. Секрети в пам'ять аппки не читаються: лише чи вони задані.
struct RelaySettings: Equatable {
    var workspace = ""
    var destId = ""
    var room = ""
    var hasWorkspaceToken = false
    var hasTicketKey = false

    var isConfigured: Bool { !workspace.isEmpty && !destId.isEmpty && !room.isEmpty && hasWorkspaceToken && hasTicketKey }
}

/// Нові секрети з форми. Порожнє поле — лишити те, що вже у файлі.
struct RelaySecrets {
    var workspaceToken = ""
    var ticketKey = ""

    var isEmpty: Bool { workspaceToken.isEmpty && ticketKey.isEmpty }
}

/// relay.env, який читає агент (`collectRelayEnv`), через EnvFile.
enum RelaySettingsStore {
    static let url = FileManager.default.homeDirectoryForCurrentUser
        .appendingPathComponent(".config/awake/relay.env")

    enum Key {
        static let workspace = "WEBHOOXY_WORKSPACE"
        static let destId = "WEBHOOXY_DEST_ID"
        static let room = "WEBHOOXY_ROOM"
        static let workspaceToken = "WEBHOOXY_WORKSPACE_TOKEN"
        static let ticketKey = "WEBHOOXY_JWT_TICKET_KEY"
    }

    static func load() -> RelaySettings {
        let values = EnvFile.read(url)
        return RelaySettings(
            workspace: values[Key.workspace] ?? "",
            destId: values[Key.destId] ?? "",
            room: values[Key.room] ?? "",
            hasWorkspaceToken: !(values[Key.workspaceToken] ?? "").isEmpty,
            hasTicketKey: !(values[Key.ticketKey] ?? "").isEmpty
        )
    }

    static func save(_ settings: RelaySettings, secrets: RelaySecrets) throws {
        var updates = [
            Key.workspace: settings.workspace,
            Key.destId: settings.destId,
            Key.room: settings.room,
        ]
        if !secrets.workspaceToken.isEmpty { updates[Key.workspaceToken] = secrets.workspaceToken }
        if !secrets.ticketKey.isEmpty { updates[Key.ticketKey] = secrets.ticketKey }
        try EnvFile.write(url, updates: updates,
                          order: [Key.workspace, Key.destId, Key.room, Key.workspaceToken, Key.ticketKey],
                          header: "Ключі webhooxy для агента awake")
    }
}
