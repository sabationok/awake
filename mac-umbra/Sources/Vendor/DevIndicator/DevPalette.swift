import SwiftUI

/// Spec §3 token table (Umbra). Defined locally: no dependency on the host app.
struct DevPalette {
    let surface: Color
    let surface2: Color
    let line: Color
    let fg: Color
    let fg3: Color
    let accent: Color
    let warn: Color
    // Neutral floating button (spec §3), not from the stage palette.
    let buttonFill: Color
    let buttonRing: Color
    let buttonIcon: Color

    init(_ scheme: ColorScheme) {
        if scheme == .dark {
            surface = Color(hex: 0x1A1A1C)
            surface2 = Color(hex: 0x222225)
            line = Color(hex: 0x2A2A2E)
            fg = Color(hex: 0xEDEDEF)
            fg3 = Color(hex: 0x6C6C73)
            accent = Color(hex: 0xFF9B2F)
            warn = Color(hex: 0xF5C542)
            buttonFill = Color(hex: 0x2C2C2E)
            buttonRing = Color.white.opacity(0.14)
            buttonIcon = Color(hex: 0xE5E5E7)
        } else {
            surface = Color(hex: 0xFFFFFF)
            surface2 = Color(hex: 0xF6F6F8)
            line = Color(hex: 0xE6E6E9)
            fg = Color(hex: 0x17171A)
            fg3 = Color(hex: 0x85858D)
            accent = Color(hex: 0xD96A00)
            warn = Color(hex: 0xB98200)
            buttonFill = Color(hex: 0xFFFFFF)
            buttonRing = Color.black.opacity(0.12)
            buttonIcon = Color(hex: 0x3A3A3C)
        }
    }

    /// Stage colour: `dev` uses the accent, `preview` the warn colour.
    func stage(_ stage: DevStage) -> Color {
        stage == .preview ? warn : accent
    }
}

extension Color {
    init(hex: UInt32) {
        self.init(
            .sRGB,
            red: Double((hex >> 16) & 0xFF) / 255,
            green: Double((hex >> 8) & 0xFF) / 255,
            blue: Double(hex & 0xFF) / 255,
            opacity: 1
        )
    }
}
