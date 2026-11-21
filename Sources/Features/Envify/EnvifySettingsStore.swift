import Foundation

/// ~/.config/awake/envify.env: токен сервісу Envify для агента. Сам токен у памʼять аппки не читається.
enum EnvifySettingsStore {
    static let url = FileManager.default.homeDirectoryForCurrentUser
        .appendingPathComponent(".config/awake/envify.env")
    private static let tokenKey = "ENVIFY_TOKEN"

    static var hasToken: Bool { !(EnvFile.read(url)[tokenKey] ?? "").isEmpty }

    static func save(token: String) throws {
        try EnvFile.write(url, updates: [tokenKey: token], order: [tokenKey], header: "Токен сервісу Envify для агента awake")
    }
}
