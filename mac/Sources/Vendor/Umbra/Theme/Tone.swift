import SwiftUI

/// Semantic tone of a badge, icon, dot or notice. The consumer maps its own data (e.g. SDUI `UiTone`) to it.
/// `accent` is the warm orange, `orange` a redder one so the two stay apart.
public enum Tone: String, CaseIterable {
    case accent, orange, green, red, yellow, indigo, gray

    public func color(_ palette: Palette) -> Color {
        switch self {
        case .accent: palette.accent
        case .orange: palette.orange
        case .green: palette.ok
        case .red: palette.danger
        case .yellow: palette.warn
        case .indigo: palette.violet
        case .gray: palette.fg3
        }
    }
}
