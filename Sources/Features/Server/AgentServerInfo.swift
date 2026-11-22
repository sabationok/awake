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

    /// Лічильники stats-рушія агента, UTC-день.
    struct Stats: Decodable, Equatable {
        struct Totals: Decodable, Equatable {
            /// шлях → клас відповіді (`2xx`…) → запити.
            let today: [String: [String: Int]]
            let total: [String: [String: Int]]
        }

        struct Starts: Decodable, Equatable {
            let today: Int
            let total: Int
        }

        let requests: Totals
        let starts: Starts
    }

    let pid: Int
    let node: String
    let stage: String
    let startedAt: Date
    let usage: Usage
    let ports: Ports
    let web: Web
    /// nil — старіший агент без stats.
    let stats: Stats?
}
