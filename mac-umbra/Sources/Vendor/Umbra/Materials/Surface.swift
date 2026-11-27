import SwiftUI

/// Background of a block. Maps the web layers to the Mac:
/// - `.panel`: `--surface-1` tint over the window material (panels, tiles); no own blur.
/// - `.raised`: `--surface-2` with a strong hairline (controls, active items).
/// - `.overlay`: within-window material + `--surface-2` + hairline + shadow (menus, toasts, dialogs).
public enum SurfaceLevel {
    case panel, raised, overlay
}

public extension View {
    func umbraSurface(_ level: SurfaceLevel = .panel, radius: CGFloat = Radius.md) -> some View {
        modifier(SurfaceModifier(level: level, radius: radius))
    }
}

private struct SurfaceModifier: ViewModifier {
    let level: SurfaceLevel
    let radius: CGFloat
    @Environment(\.umbra) private var theme

    func body(content: Content) -> some View {
        let shape = RoundedRectangle(cornerRadius: radius, style: .continuous)
        let p = theme.palette
        switch level {
        case .panel:
            content.background(p.surface1, in: shape)
        case .raised:
            content
                .background(p.surface2, in: shape)
                .overlay(shape.strokeBorder(p.lineStrong, lineWidth: 1))
        case .overlay:
            content
                .background {
                    ZStack {
                        if theme.translucent { shape.fill(.regularMaterial) }
                        shape.fill(p.surface2)
                    }
                }
                .overlay(shape.strokeBorder(p.lineStrong, lineWidth: 1))
                .compositingGroup()
                .shadow(color: p.shadow, radius: 20, y: 12)
        }
    }
}
