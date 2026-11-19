import Foundation

/// Тривалість сесії. `id` передається скрипту як аргумент: 30m, 8h, 1d.
struct SessionPreset: Identifiable, Hashable {
    let id: String
    let title: String
    let seconds: Int

    static let all: [SessionPreset] = [
        .init(id: "30m", title: "30 хв", seconds: 1800),
        .init(id: "1h", title: "1 год", seconds: 3600),
        .init(id: "2h", title: "2 год", seconds: 7200),
        .init(id: "4h", title: "4 год", seconds: 14400),
        .init(id: "8h", title: "8 год", seconds: 28800),
        .init(id: "1d", title: "Доба", seconds: 86400),
    ]
    static let `default` = all[1]

    private static let defaultsKey = "sessionPreset"

    /// Тривалість за замовчуванням, збережена між запусками.
    static var saved: SessionPreset {
        get {
            let id = UserDefaults.standard.string(forKey: defaultsKey)
            return all.first { $0.id == id } ?? .default
        }
        set { UserDefaults.standard.set(newValue.id, forKey: defaultsKey) }
    }

    static func find(_ id: String) -> SessionPreset? {
        all.first { $0.id == id.lowercased() }
    }

    static var ids: String { all.map(\.id).joined(separator: " ") }
}
