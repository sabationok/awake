import Foundation

/// Інстанс сервера агента від агента (`server`). Поля збігаються з `ServerInfo` у contracts.
struct AgentServerInfo: Decodable, Equatable {
    struct Ports: Decodable, Equatable {
        let https: Int
        let http: Int
        let tailnet: Int
    }

    struct Web: Decodable, Equatable {
        /// published | bundle | nil
        let source: String?
        let dir: String?
        let builtAt: Date?
    }

    /// Навантаження за останні ~10 с.
    struct Usage: Decodable, Equatable {
        /// % одного ядра.
        let cpu: Double
        let rss: Int
        let heapUsed: Int
        let load: Double
    }

    let pid: Int
    let node: String
    let stage: String
    let startedAt: Date
    let usage: Usage
    let ports: Ports
    let web: Web
}
