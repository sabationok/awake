import Foundation

extension AwakeModel {
    /// Пише relay.env і просить агента перечитати його. Значення агенту не передаються: він читає файл сам.
    func saveRelaySettings(_ settings: RelaySettings, secrets: RelaySecrets) throws {
        try RelaySettingsStore.save(settings, secrets: secrets)
        struct Reload: Encodable { let action = "reload" }
        agent.send(type: "relayEnv", data: Reload())
        append("Ключі webhooxy збережено")
    }
}
