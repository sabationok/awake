import Foundation

/// Знімок від агента: сполучені пристрої і посилання для нового. Поля збігаються з `DevicesSnapshot` у contracts.
struct AgentDevices: Decodable, Equatable {
    struct Device: Decodable, Equatable, Identifiable {
        let id: Int
        let name: String
        let userAgent: String?
        let createdAt: Date
        let lastSeenAt: Date?
        let via: Mode
    }

    /// Пристрій відкрив посилання з QR і чекає «Дозволити».
    struct Request: Decodable, Equatable, Identifiable {
        let id: String
        let name: String
        let userAgent: String?
        let createdAt: Date
        let expiresAt: Date
        let via: Mode
    }

    /// Шлях сполучення: `local` — напряму в довіреній Wi-Fi, `remote` — через дашборд на Vercel і relay.
    enum Mode: String, Decodable, CaseIterable, Identifiable {
        case local, tailnet, remote
        var id: String { rawValue }
    }

    /// Посилання з одноразовим кодом або причина, чому його зараз немає
    /// (`untrusted`, `noNetwork` — для local; `tailnetOff` — для tailnet; `relayOff`, `disabled` — для remote;
    /// `loading` — аппка ще чекає агента).
    struct Pairing: Decodable, Equatable {
        let url: String?
        let expiresAt: Date?
        let reason: String?
    }

    let devices: [Device]
    let requests: [Request]
    /// По посиланню на кожен шлях, код у них спільний.
    let pairing: Pairings

    struct Pairings: Decodable, Equatable {
        let local: Pairing
        let tailnet: Pairing
        let remote: Pairing

        subscript(mode: Mode) -> Pairing {
            switch mode {
            case .local: local
            case .tailnet: tailnet
            case .remote: remote
            }
        }

        /// Пункти селектора: усі шляхи; без посилання — сірі (дистанційний сірий, поки webhooxy вимкнено в агенті).
        var modes: [Mode] { Mode.allCases }

        private enum CodingKeys: String, CodingKey { case local, tailnet, remote }

        init(local: Pairing, tailnet: Pairing, remote: Pairing) {
            self.local = local
            self.tailnet = tailnet
            self.remote = remote
        }

        /// Старий агент (або кеш) без `tailnet`: вкладка є, але з причиною.
        init(from decoder: Decoder) throws {
            let container = try decoder.container(keyedBy: CodingKeys.self)
            local = try container.decode(Pairing.self, forKey: .local)
            tailnet = try container.decodeIfPresent(Pairing.self, forKey: .tailnet) ?? Pairing(url: nil, expiresAt: nil, reason: "tailnetOff")
            remote = try container.decodeIfPresent(Pairing.self, forKey: .remote) ?? Pairing(url: nil, expiresAt: nil, reason: "disabled")
        }
    }
}
