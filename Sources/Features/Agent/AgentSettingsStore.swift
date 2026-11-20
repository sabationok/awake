import Foundation
import Security

struct AgentSettings: Equatable {
    /// Головний токен агента. Генерується один раз і з Mac не виходить.
    var token = ""
    var port = 47800
    var upstashURL = ""
    var upstashToken = ""
    /// Шлях до node, якщо автопошук не знайшов потрібний.
    var nodePath = ""

    var hasUpstash: Bool { !upstashURL.isEmpty && !upstashToken.isEmpty }
}

/// Файл ~/.config/awake/agent.env з правами 600. З нього ж агент отримує env.
enum AgentSettingsStore {
    static let url = FileManager.default.homeDirectoryForCurrentUser
        .appendingPathComponent(".config/awake/agent.env")

    static func load() -> AgentSettings {
        var settings = AgentSettings()
        if let text = try? String(contentsOf: url, encoding: .utf8) {
            for line in text.split(separator: "\n") {
                let parts = line.split(separator: "=", maxSplits: 1).map(String.init)
                guard parts.count == 2 else { continue }
                let value = parts[1].trimmingCharacters(in: CharacterSet(charactersIn: "'\" "))
                switch parts[0] {
                case "AWAKE_AGENT_TOKEN": settings.token = value
                case "AWAKE_AGENT_PORT": settings.port = Int(value) ?? settings.port
                case "UPSTASH_REDIS_REST_URL": settings.upstashURL = value
                case "UPSTASH_REDIS_REST_TOKEN": settings.upstashToken = value
                case "NODE": settings.nodePath = value
                default: break
                }
            }
        }
        if settings.token.isEmpty {
            settings.token = randomToken()
            try? save(settings)
        }
        return settings
    }

    static func save(_ settings: AgentSettings) throws {
        let values = [settings.upstashURL, settings.upstashToken, settings.nodePath].map {
            $0.trimmingCharacters(in: .whitespacesAndNewlines)
        }
        guard !values.contains(where: { $0.contains("'") || $0.contains("\n") }) else {
            throw TelegramSettingsStore.StoreError.invalidCharacter
        }
        let body = """
        # Налаштування агента Awake (пульт і Upstash)
        AWAKE_AGENT_TOKEN='\(settings.token)'
        AWAKE_AGENT_PORT='\(settings.port)'
        UPSTASH_REDIS_REST_URL='\(values[0])'
        UPSTASH_REDIS_REST_TOKEN='\(values[1])'
        NODE='\(values[2])'

        """
        try FileManager.default.createDirectory(at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
        try body.write(to: url, atomically: true, encoding: .utf8)
        try FileManager.default.setAttributes([.posixPermissions: 0o600], ofItemAtPath: url.path)
    }

    /// Змінні середовища для процесу агента.
    static func environment(_ settings: AgentSettings) -> [String: String] {
        var env = ProcessInfo.processInfo.environment
        env["AWAKE_AGENT_TOKEN"] = settings.token
        env["AWAKE_AGENT_PORT"] = String(settings.port)
        if settings.hasUpstash {
            env["UPSTASH_REDIS_REST_URL"] = settings.upstashURL
            env["UPSTASH_REDIS_REST_TOKEN"] = settings.upstashToken
        }
        return env
    }

    private static func randomToken() -> String {
        var bytes = [UInt8](repeating: 0, count: 32)
        _ = SecRandomCopyBytes(kSecRandomDefault, bytes.count, &bytes)
        return bytes.map { String(format: "%02x", $0) }.joined()
    }
}
