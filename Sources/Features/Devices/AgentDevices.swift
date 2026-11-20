import Foundation

/// Знімок від агента: сполучені пристрої і посилання для нового. Поля збігаються з `DevicesSnapshot` у contracts.
struct AgentDevices: Decodable, Equatable {
    struct Device: Decodable, Equatable, Identifiable {
        let id: Int
        let name: String
        let userAgent: String?
        let createdAt: Date
        let lastSeenAt: Date?
    }

    /// Пристрій відкрив посилання з QR і чекає «Дозволити».
    struct Request: Decodable, Equatable, Identifiable {
        let id: String
        let name: String
        let userAgent: String?
        let createdAt: Date
        let expiresAt: Date
    }

    /// Посилання з одноразовим кодом або причина, чому його зараз немає.
    struct Pairing: Decodable, Equatable {
        let url: String?
        let expiresAt: Date?
        let reason: String?
    }

    let devices: [Device]
    let requests: [Request]
    let pairing: Pairing
}
