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

/// relay.env, який читає агент (`parseRelayEnv`). Права 600; чужі рядки й коментарі зберігаються.
enum RelaySettingsStore {
    enum StoreError: LocalizedError {
        case invalidCharacter
        var errorDescription: String? { "недопустимий символ ' або перенос рядка" }
    }

    static let url = FileManager.default.homeDirectoryForCurrentUser
        .appendingPathComponent(".config/awake/relay.env")

    private enum Key {
        static let workspace = "WEBHOOXY_WORKSPACE"
        static let destId = "WEBHOOXY_DEST_ID"
        static let room = "WEBHOOXY_ROOM"
        static let workspaceToken = "WEBHOOXY_WORKSPACE_TOKEN"
        static let ticketKey = "WEBHOOXY_JWT_TICKET_KEY"
    }

    static func load() -> RelaySettings {
        let values = read()
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
        updates = updates.mapValues { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
        guard updates.values.allSatisfy({ !$0.contains("'") && !$0.contains("\n") }) else { throw StoreError.invalidCharacter }

        // Рядки з нашими ключами замінюються на місці, решта лишається як є.
        var lines = ((try? String(contentsOf: url, encoding: .utf8)) ?? "# Ключі webhooxy для агента awake\n")
            .components(separatedBy: "\n")
        if lines.last == "" { lines.removeLast() }
        var pending = updates
        lines = lines.map { line in
            guard let name = keyName(line), let value = pending.removeValue(forKey: name) else { return line }
            return "\(name)='\(value)'"
        }
        for name in [Key.workspace, Key.destId, Key.room, Key.workspaceToken, Key.ticketKey] {
            if let value = pending[name] { lines.append("\(name)='\(value)'") }
        }

        try FileManager.default.createDirectory(at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
        try (lines.joined(separator: "\n") + "\n").write(to: url, atomically: true, encoding: .utf8)
        try FileManager.default.setAttributes([.posixPermissions: 0o600], ofItemAtPath: url.path)
    }

    private static func read() -> [String: String] {
        guard let text = try? String(contentsOf: url, encoding: .utf8) else { return [:] }
        var values: [String: String] = [:]
        for line in text.split(separator: "\n") {
            let parts = line.split(separator: "=", maxSplits: 1).map(String.init)
            guard parts.count == 2, let name = keyName(String(line)) else { continue }
            values[name] = parts[1].trimmingCharacters(in: CharacterSet(charactersIn: "'\" "))
        }
        return values
    }

    private static func keyName(_ line: String) -> String? {
        let trimmed = line.trimmingCharacters(in: .whitespaces)
        guard !trimmed.hasPrefix("#"), let equals = trimmed.firstIndex(of: "=") else { return nil }
        return String(trimmed[..<equals]).trimmingCharacters(in: .whitespaces)
    }
}
