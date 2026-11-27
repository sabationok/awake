import AppKit

/// The client's own theme: `system | light | dark`, `dark` by default. The owner chose to keep it per client
/// (a local view preference, the agreed exception to «clients keep no data»); the server never sees it.
/// Stored in UserDefaults under `theme`; `--theme` (screenshots) overrides it without writing it.
enum ThemeSetting: String, CaseIterable {
    case system, light, dark

    static let key = "theme"
    static let fallback = ThemeSetting.dark

    /// Same labels and order as web-umbra's «Вигляд» section.
    var label: String {
        switch self {
        case .system: "Системна"
        case .light: "Світла"
        case .dark: "Темна"
        }
    }

    static func stored(_ raw: String?) -> ThemeSetting {
        raw.flatMap(ThemeSetting.init(rawValue:)) ?? fallback
    }

    /// AppKit side for every window: nil follows macOS. Set before the first layout too, since a later switch can
    /// leave SF Symbols shifted.
    var appearance: NSAppearance? {
        switch self {
        case .system: nil
        case .light: NSAppearance(named: .aqua)
        case .dark: NSAppearance(named: .darkAqua)
        }
    }
}
