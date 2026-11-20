import Foundation

/// Мережі Wi-Fi, у яких агент публікує свою локальну адресу і приймає запити з інших пристроїв.
enum TrustedNetworks {
    private static let key = "agent.trustedSSIDs"

    static var saved: [String] {
        get { UserDefaults.standard.stringArray(forKey: key) ?? [] }
        set { UserDefaults.standard.set(newValue, forKey: key) }
    }
}
