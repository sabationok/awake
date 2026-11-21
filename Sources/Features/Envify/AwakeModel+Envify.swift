import Foundation

extension AwakeModel {
    /// Пише envify.env і просить агента заново стягнути змінні. Токен агенту не передається: він читає файл сам.
    func saveEnvifyToken(_ token: String) throws {
        try EnvifySettingsStore.save(token: token)
        refreshEnvify()
        append("Токен Envify збережено")
    }

    /// Агент заново тягне змінні з Envify (після зміни значень у вебі Envify).
    func refreshEnvify() {
        struct Reload: Encodable { let action = "reload" }
        agent.send(type: "envify", data: Reload())
    }
}
