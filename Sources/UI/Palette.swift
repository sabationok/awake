import AppKit
import SwiftUI

/// App surface colors, matched to macOS System Settings (dark values sampled from it: content #2E2E2E,
/// cards #373737, separators #434343, segment track #4A4A4A). Each adapts to light / dark.
enum Palette {
    /// Main content area (the island).
    static let content = dynamic(light: 0xF5F5F5, dark: 0x2E2E2E)
    /// Grouped cards and rows on the content area.
    static let card = dynamic(light: 0xFFFFFF, dark: 0x373737)
    /// Hairlines between rows and around panels.
    static let separator = dynamic(light: 0xE2E2E2, dark: 0x434343)
    /// Unselected track of segmented tabs.
    static let segmentTrack = dynamic(light: 0xE3E3E3, dark: 0x4A4A4A)

    private static func dynamic(light: UInt32, dark: UInt32) -> Color {
        Color(nsColor: NSColor(name: nil) { appearance in
            let isDark = appearance.bestMatch(from: [.darkAqua, .aqua]) == .darkAqua
            return NSColor(rgb: isDark ? dark : light)
        })
    }
}

private extension NSColor {
    convenience init(rgb: UInt32) {
        self.init(srgbRed: CGFloat((rgb >> 16) & 0xFF) / 255, green: CGFloat((rgb >> 8) & 0xFF) / 255,
                  blue: CGFloat(rgb & 0xFF) / 255, alpha: 1)
    }
}
