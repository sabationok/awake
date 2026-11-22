import Foundation

extension AwakeModel {
    /// Пише secrets.env і просить агента перечитати секрети. Значення агенту не передаються: він читає файл сам.
    func saveAppSecrets(_ values: [String: String]) throws {
        try AppSecretsStore.save(values)
        struct Reload: Encodable { let action = "reload" }
        agent.send(type: "relayEnv", data: Reload())
        append("Ключі аппки збережено")
    }
}
