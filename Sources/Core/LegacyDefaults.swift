import Foundation

/// Налаштування аппки зі старого bundle id `dev.vitalii.awake`: один раз копіюються в новий домен,
/// щоб після перейменування не загубились вибрана сторінка, бічна панель і стан модулів.
enum LegacyDefaults {
    private static let legacyDomain = "dev.vitalii.awake"
    /// Стан Sparkle не переносимо: нова аппка сама перевірить оновлення.
    private static let skippedPrefix = "SU"

    static func migrate() {
        guard let domain = Bundle.main.bundleIdentifier, domain != legacyDomain else { return }
        let defaults = UserDefaults.standard
        // Новий домен уже має свої налаштування — нічого не чіпаємо.
        guard (defaults.persistentDomain(forName: domain) ?? [:]).isEmpty,
              let legacy = defaults.persistentDomain(forName: legacyDomain), !legacy.isEmpty else { return }
        defaults.setPersistentDomain(legacy.filter { !$0.key.hasPrefix(skippedPrefix) }, forName: domain)
    }
}
