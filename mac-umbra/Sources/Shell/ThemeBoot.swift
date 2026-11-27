import AppKit

/// Port of `web-umbra/src/shell/theme-boot.ts` (`ThemeChoice`, `THEME_KEY`, `DEFAULT_THEME`).
/// The client's own theme: `system | light | dark`, `dark` by default. The owner chose to keep it per client
/// (a local view preference, the agreed exception to «clients keep no data»); the server never sees it.
/// Stored in UserDefaults under `theme`; `--theme` (screenshots) overrides it without writing it.
enum ThemeChoice: String, CaseIterable {
    case system, light, dark

    static let key = "theme"
    static let defaultTheme = ThemeChoice.dark

    /// Same labels and order as web-umbra's «Вигляд» section.
    var label: String {
        switch self {
        case .system: "Системна"
        case .light: "Світла"
        case .dark: "Темна"
        }
    }

    static func stored(_ raw: String?) -> ThemeChoice {
        raw.flatMap(ThemeChoice.init(rawValue:)) ?? defaultTheme
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
