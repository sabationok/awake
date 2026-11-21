import Foundation

/// Старе місце списку довірених мереж (UserDefaults). Тепер список у SQLite агента; звідси його один раз переносять.
enum LegacyTrustedNetworks {
    private static let key = "agent.trustedSSIDs"

    static var saved: [String] { UserDefaults.standard.stringArray(forKey: key) ?? [] }

    static func clear() { UserDefaults.standard.removeObject(forKey: key) }
}
