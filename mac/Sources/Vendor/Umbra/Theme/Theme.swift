import SwiftUI

/// Resolved theme: palette plus the scheme it was made for and whether surfaces are translucent.
public struct Theme {
    public var palette: Palette
    public var scheme: ColorScheme
    /// False when the owner turned on «Reduce transparency»: solid tokens, no window material.
    public var translucent: Bool

    public static func dark(translucent: Bool = true) -> Theme {
        Theme(palette: .dark(translucent: translucent), scheme: .dark, translucent: translucent)
    }

    public static func light(translucent: Bool = true) -> Theme {
        Theme(palette: .light(translucent: translucent), scheme: .light, translucent: translucent)
    }
}

/// Which theme a window uses. `.system` follows the macOS appearance.
public enum ThemeMode: String, CaseIterable, Identifiable {
    case system, dark, light
    public var id: String { rawValue }
}

private struct ThemeKey: EnvironmentKey {
    static let defaultValue = Theme.dark()
}

public extension EnvironmentValues {
    /// Current Umbra theme. Set it once at the window root with `.umbraTheme(_:)`.
    var umbra: Theme {
        get { self[ThemeKey.self] }
        set { self[ThemeKey.self] = newValue }
    }
}

public extension View {
    /// Applies an Umbra theme to the subtree: tokens in the environment, the matching appearance for
    /// native materials and controls, and the accent as tint.
    /// `translucent: false` forces solid tokens (an owner setting, or a render where materials do not exist).
    func umbraTheme(_ mode: ThemeMode = .system, translucent: Bool = true) -> some View {
        modifier(ThemeModifier(mode: mode, translucent: translucent))
    }
}

private struct ThemeModifier: ViewModifier {
    let mode: ThemeMode
    let translucent: Bool
    @Environment(\.colorScheme) private var systemScheme
    @Environment(\.accessibilityReduceTransparency) private var reduceTransparency

    func body(content: Content) -> some View {
        let scheme: ColorScheme = switch mode {
        case .dark: .dark
        case .light: .light
        case .system: systemScheme
        }
        let see = translucent && !reduceTransparency
        let theme: Theme = scheme == .dark ? .dark(translucent: see) : .light(translucent: see)
        content
            .environment(\.umbra, theme)
            .tint(theme.palette.accent)
            .foregroundStyle(theme.palette.fg)
            .font(Font.body)
            .preferredColorScheme(mode == .system ? nil : scheme)
    }
}
