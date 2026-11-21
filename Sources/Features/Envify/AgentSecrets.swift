import Foundation

/// Знімок від агента: стан Envify і звідки кожен ключ relay. Поля збігаються з `SecretsSnapshot` у contracts.
struct AgentSecrets: Decodable, Equatable {
    struct Envify: Decodable, Equatable {
        /// off | loading | ok | error
        let state: String
        let url: String?
        let error: String?
        let count: Int
        let loadedAt: Date?
    }

    /// Один ключ: звідки він (`env`, `envify`, `file` або nil) і значення, якщо це не секрет.
    struct Key: Decodable, Equatable {
        let name: String
        let source: String?
        let secret: Bool
        let value: String?
    }

    let envify: Envify
    let relay: [Key]

    func relayKey(_ name: String) -> Key? { relay.first { $0.name == name } }
}

extension AgentSecrets.Key {
    /// Підпис джерела в рядку форми.
    var sourceLabel: String? {
        switch source {
        case "envify": "Envify"
        case "file": "relay.env"
        case "env": "process.env"
        default: nil
        }
    }

    /// Ключ прийшов не з relay.env: зміна у файлі його не перебʼє.
    var isOverridden: Bool { source == "envify" || source == "env" }
}
