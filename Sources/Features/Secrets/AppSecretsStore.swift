import Foundation

/// ~/.config/awake/secrets.env: глобальні секрети аппки для агента. Значення в пам'ять аппки не читаються.
enum AppSecretsStore {
    static let url = FileManager.default.homeDirectoryForCurrentUser
        .appendingPathComponent(".config/awake/secrets.env")

    enum Key {
        static let workspaceToken = "WEBHOOXY_WORKSPACE_TOKEN"
        static let jwtKey = "MACONTROL_JWT_KEY"
        static let dashboardPassword = "MACONTROL_DASHBOARD_PASSWORD"
        static let all = [workspaceToken, jwtKey, dashboardPassword]
    }

    static func isSet(_ key: String) -> Bool { !(EnvFile.read(url)[key] ?? "").isEmpty }

    /// Порожні значення не пишуться: лишається те, що вже у файлі.
    static func save(_ values: [String: String]) throws {
        let updates = values.filter { !$0.value.isEmpty }
        guard !updates.isEmpty else { return }
        try EnvFile.write(url, updates: updates, order: Key.all, header: "Глобальні секрети аппки для агента awake")
    }
}
