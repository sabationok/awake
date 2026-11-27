import SwiftUI

/// `.u-skel`: a placeholder block in place of content that is not ready yet (a tab's charts on its first frame, data
/// on its way from the server). It pulses softly; a host shows it in the content area only, never on the control
/// that asked for the content (a tab or segmented switch moves at once and is never blocked).
public struct UmbraSkeleton: View {
    private let height: CGFloat
    private let width: CGFloat?
    private let radius: CGFloat
    @State private var dim = false
    @Environment(\.umbra) private var theme

    public init(height: CGFloat = 14, width: CGFloat? = nil, radius: CGFloat = UmbraRadius.sm) {
        self.height = height
        self.width = width
        self.radius = radius
    }

    public var body: some View {
        RoundedRectangle(cornerRadius: radius, style: .continuous)
            .fill(theme.palette.surface3)
            .opacity(dim ? 0.5 : 1)
            // Scoped to the opacity: `withAnimation(.repeatForever)` in `onAppear` would leak the endless
            // transaction onto everything laid out in the same update (measured: the frame cost 3x).
            .animation(.easeInOut(duration: 0.8).repeatForever(autoreverses: true), value: dim)
            .frame(width: width, height: height)
            .frame(maxWidth: width == nil ? .infinity : nil, alignment: .leading)
            .onAppear { dim = true }
            .accessibilityHidden(true)
    }
}
