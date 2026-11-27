import SwiftUI

/// Window background. Translucent: the desktop through `.underWindowBackground`, darkened (or lightened) by
/// `windowTint` so the Umbra blacks stay black. Solid when «Reduce transparency» is on.
/// `glow: .accent` adds the soft accent spots of the web backdrop (top, centre, bottom), much weaker here
/// because the real desktop already gives colour.
public struct Backdrop: View {
    public enum Glow { case none, accent }

    private let glow: Glow
    @Environment(\.umbra) private var theme

    public init(glow: Glow = .none) {
        self.glow = glow
    }

    public var body: some View {
        ZStack {
            if theme.translucent {
                UmbraVisualEffect(.underWindowBackground)
                theme.palette.windowTint
            } else {
                theme.palette.bgSolid
            }
            if glow == .accent {
                GlowLayer(dark: theme.scheme == .dark)
            }
        }
        .ignoresSafeArea()
    }
}

private struct GlowLayer: View {
    let dark: Bool

    private struct Spot {
        let x: Double, y: Double, radius: Double, color: Color
    }

    private var spots: [Spot] {
        // Web: dark theme in the accent spectrum only; light theme in different accent colours.
        dark ? [
            Spot(x: 0.18, y: 0.0, radius: 0.48, color: Color(umbraHex: 0xFF9B2F, alpha: 0.26)),
            Spot(x: 0.86, y: 0.06, radius: 0.42, color: Color(umbraHex: 0xFF7A45, alpha: 0.2)),
            Spot(x: 0.52, y: 0.52, radius: 0.40, color: Color(umbraHex: 0xFFB766, alpha: 0.1)),
            Spot(x: 0.30, y: 1.0, radius: 0.52, color: Color(umbraHex: 0xFF7A45, alpha: 0.18)),
            Spot(x: 0.92, y: 0.96, radius: 0.42, color: Color(umbraHex: 0xFF9B2F, alpha: 0.14)),
        ] : [
            Spot(x: 0.18, y: 0.0, radius: 0.45, color: Color(umbraHex: 0xFF9B2F, alpha: 0.22)),
            Spot(x: 0.86, y: 0.06, radius: 0.40, color: Color(umbraHex: 0x7D6BFF, alpha: 0.16)),
            Spot(x: 0.52, y: 0.52, radius: 0.38, color: Color(umbraHex: 0xFFB766, alpha: 0.1)),
            Spot(x: 0.30, y: 1.0, radius: 0.50, color: Color(umbraHex: 0x3FCF8E, alpha: 0.12)),
            Spot(x: 0.92, y: 0.96, radius: 0.40, color: Color(umbraHex: 0xFF7896, alpha: 0.14)),
        ]
    }

    var body: some View {
        GeometryReader { geo in
            let side = max(geo.size.width, geo.size.height)
            ZStack {
                ForEach(spots.indices, id: \.self) { index in
                    let spot = spots[index]
                    RadialGradient(colors: [spot.color, spot.color.opacity(0)],
                                   center: UnitPoint(x: spot.x, y: spot.y),
                                   startRadius: 0, endRadius: side * spot.radius)
                }
            }
        }
        .allowsHitTesting(false)
    }
}
