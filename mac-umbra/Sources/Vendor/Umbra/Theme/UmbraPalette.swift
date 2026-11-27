import SwiftUI

/// Colour roles of Umbra. Same names as the web tokens in `web-umbra/src/app/globals.css`
/// (`--bg`, `--surface-1`, `--fg-2`, …), so a design change is made once per role on both clients.
public struct UmbraPalette {
    /// Window base when translucency is off.
    public var bgSolid: Color
    /// Layer over the window material: how much of the desktop shows through.
    public var windowTint: Color
    /// Sidebar and inset wells (copy field, input).
    public var bgApp: Color
    /// Panels and tiles.
    public var surface1: Color
    /// Raised controls, menus, toasts, active sidebar item.
    public var surface2: Color
    /// Pressed / selected inside a control, switch track off.
    public var surface3: Color
    public var line: Color
    public var lineStrong: Color
    public var fg: Color
    public var fg2: Color
    public var fg3: Color
    public var accent: Color
    public var accent2: Color
    public var accentSoft: Color
    /// Text on an accent fill.
    public var accentInk: Color
    public var violet: Color
    public var ok: Color
    public var warn: Color
    public var danger: Color
    public var orange: Color
    public var switchKnob: Color
    public var shadow: Color
    public var scrim: Color
}

public extension UmbraPalette {
    /// Dark theme (Resend-like: black, thin lines, one warm accent).
    static func dark(translucent: Bool) -> UmbraPalette {
        UmbraPalette(
            bgSolid: Color(umbraHex: 0x000000),
            windowTint: Color(umbraHex: 0x060403, alpha: 0.42),
            bgApp: translucent ? Color(umbraHex: 0x080707, alpha: 0.38) : Color(umbraHex: 0x0C0C0D),
            surface1: translucent ? Color(umbraHex: 0x141212, alpha: 0.5) : Color(umbraHex: 0x141415),
            surface2: translucent ? Color(umbraHex: 0x202024, alpha: 0.78) : Color(umbraHex: 0x1A1A1C),
            surface3: translucent ? Color(umbraHex: 0x34343A, alpha: 0.6) : Color(umbraHex: 0x232326),
            line: translucent ? Color.white.opacity(0.07) : Color(umbraHex: 0x222225),
            lineStrong: translucent ? Color.white.opacity(0.12) : Color(umbraHex: 0x303034),
            fg: Color(umbraHex: 0xEDEDEF),
            fg2: Color(umbraHex: 0xA3A3AA),
            fg3: Color(umbraHex: 0x6C6C73),
            accent: Color(umbraHex: 0xFF9B2F),
            accent2: Color(umbraHex: 0xFFB766),
            accentSoft: Color(umbraHex: 0xFF9B2F, alpha: 0.12),
            accentInk: Color(umbraHex: 0x1C1000),
            violet: Color(umbraHex: 0x7D6BFF),
            ok: Color(umbraHex: 0x3FCF8E),
            warn: Color(umbraHex: 0xF5C542),
            danger: Color(umbraHex: 0xFF5F5F),
            orange: Color(umbraHex: 0xFF7A45),
            switchKnob: Color(umbraHex: 0xE8E8EA),
            shadow: Color.black.opacity(0.6),
            scrim: Color.black.opacity(0.6)
        )
    }

    /// Light theme (trial on the web): page grey, panels white, darker accent so small orange text reads on white.
    static func light(translucent: Bool) -> UmbraPalette {
        UmbraPalette(
            bgSolid: Color(umbraHex: 0xF2F2F4),
            windowTint: Color(umbraHex: 0xF4F3F6, alpha: 0.36),
            bgApp: translucent ? Color.white.opacity(0.35) : Color(umbraHex: 0xE8E8EB),
            surface1: translucent ? Color.white.opacity(0.62) : Color(umbraHex: 0xFFFFFF),
            surface2: translucent ? Color.white.opacity(0.85) : Color(umbraHex: 0xF6F6F8),
            surface3: translucent ? Color.black.opacity(0.05) : Color(umbraHex: 0xECECEF),
            line: translucent ? Color.black.opacity(0.07) : Color(umbraHex: 0xE6E6E9),
            lineStrong: translucent ? Color.black.opacity(0.12) : Color(umbraHex: 0xD6D6DB),
            fg: Color(umbraHex: 0x17171A),
            fg2: Color(umbraHex: 0x4F4F57),
            fg3: Color(umbraHex: 0x85858D),
            accent: Color(umbraHex: 0xD96A00),
            accent2: Color(umbraHex: 0xF08A1C),
            accentSoft: Color(umbraHex: 0xD96A00, alpha: 0.12),
            accentInk: Color.white,
            violet: Color(umbraHex: 0x6150E8),
            ok: Color(umbraHex: 0x119A63),
            warn: Color(umbraHex: 0xB98200),
            danger: Color(umbraHex: 0xDC3C42),
            orange: Color(umbraHex: 0xE0581F),
            switchKnob: Color.white,
            shadow: Color(umbraHex: 0x14141E, alpha: 0.16),
            scrim: Color(umbraHex: 0x14141E, alpha: 0.35)
        )
    }
}

public extension Color {
    /// `0xRRGGBB` in sRGB.
    init(umbraHex rgb: UInt32, alpha: Double = 1) {
        self.init(.sRGB,
                  red: Double((rgb >> 16) & 0xFF) / 255,
                  green: Double((rgb >> 8) & 0xFF) / 255,
                  blue: Double(rgb & 0xFF) / 255,
                  opacity: alpha)
    }
}
