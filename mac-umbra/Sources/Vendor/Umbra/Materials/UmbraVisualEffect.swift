import AppKit
import SwiftUI

/// `NSVisualEffectView` for SwiftUI: real macOS translucency (what the web imitates with `--backdrop`).
public struct UmbraVisualEffect: NSViewRepresentable {
    public var material: NSVisualEffectView.Material
    public var blending: NSVisualEffectView.BlendingMode
    /// `.active` keeps the window translucent when it is not key; `.followsWindowActiveState` greys it out.
    public var state: NSVisualEffectView.State

    public init(_ material: NSVisualEffectView.Material,
                blending: NSVisualEffectView.BlendingMode = .behindWindow,
                state: NSVisualEffectView.State = .active) {
        self.material = material
        self.blending = blending
        self.state = state
    }

    public func makeNSView(context: Context) -> NSVisualEffectView {
        let view = NSVisualEffectView()
        update(view)
        return view
    }

    public func updateNSView(_ view: NSVisualEffectView, context: Context) {
        update(view)
    }

    private func update(_ view: NSVisualEffectView) {
        view.material = material
        view.blendingMode = blending
        view.state = state
    }
}
