import AppKit
import CoreImage
import SwiftUI

/// Real macOS translucency (`NSVisualEffectView`, what the web imitates with `--backdrop`).
///
/// Behind-window blending samples what the window server shows under the window, so an offscreen render
/// (`cacheDisplay`) has nothing there. For such renders `umbraVibrancyPreview(_:)` puts a stand-in desktop image
/// into the environment: every effect view draws its own slice of that image, blurred and dimmed like the material,
/// so the layers' tints can be compared on screenshots. Without it (every normal run) this is `NSVisualEffectView`.
public struct UmbraVisualEffect: View {
    public var material: NSVisualEffectView.Material
    public var blending: NSVisualEffectView.BlendingMode
    /// `.active` keeps the window translucent when it is not key; `.followsWindowActiveState` greys it out.
    public var state: NSVisualEffectView.State
    @Environment(\.umbraVibrancyPreview) private var preview
    @Environment(\.colorScheme) private var scheme

    public init(_ material: NSVisualEffectView.Material,
                blending: NSVisualEffectView.BlendingMode = .behindWindow,
                state: NSVisualEffectView.State = .active) {
        self.material = material
        self.blending = blending
        self.state = state
    }

    public var body: some View {
        if let preview {
            GeometryReader { geo in
                let frame = geo.frame(in: .global)
                Image(nsImage: preview)
                    .resizable()
                    .frame(width: preview.size.width, height: preview.size.height)
                    .offset(x: -frame.minX, y: -frame.minY)
                    .frame(width: frame.width, height: frame.height, alignment: .topLeading)
                    .clipped()
                    .overlay(scheme == .dark ? Color.black.opacity(0.45) : Color.white.opacity(0.45))
            }
        } else {
            Representable(material: material, blending: blending, state: state)
        }
    }

    private struct Representable: NSViewRepresentable {
        let material: NSVisualEffectView.Material
        let blending: NSVisualEffectView.BlendingMode
        let state: NSVisualEffectView.State

        func makeNSView(context: Context) -> NSVisualEffectView {
            let view = NSVisualEffectView()
            updateNSView(view, context: context)
            return view
        }

        func updateNSView(_ view: NSVisualEffectView, context: Context) {
            view.material = material
            view.blendingMode = blending
            view.state = state
        }
    }
}

private struct VibrancyPreviewKey: EnvironmentKey {
    static let defaultValue: NSImage? = nil
}

public extension EnvironmentValues {
    /// Stand-in desktop for offscreen renders; see `UmbraVisualEffect`.
    var umbraVibrancyPreview: NSImage? {
        get { self[VibrancyPreviewKey.self] }
        set { self[VibrancyPreviewKey.self] = newValue }
    }
}

public extension View {
    /// Draws translucent layers over `image` (window-sized, window coordinates) instead of the real desktop.
    /// Only for offscreen screenshots and previews.
    func umbraVibrancyPreview(_ image: NSImage?) -> some View {
        environment(\.umbraVibrancyPreview, image.flatMap(blurred))
    }
}

/// Blurred once with CoreImage, not with `.blur`: `cacheDisplay` (offscreen shots) ignores layer filters.
private func blurred(_ image: NSImage) -> NSImage? {
    guard let tiff = image.tiffRepresentation, let input = CIImage(data: tiff) else { return nil }
    let output = input.clampedToExtent().applyingGaussianBlur(sigma: 30).cropped(to: input.extent)
    let rep = NSCIImageRep(ciImage: output)
    let result = NSImage(size: image.size)
    result.addRepresentation(rep)
    return result
}
