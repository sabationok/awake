import AppKit
import SwiftUI

/// How the macOS title bar looks.
/// - `.transparentTitlebar` (variant A): standard 28 pt title bar, transparent, in the backdrop's tones; the whole
///   layout starts below it.
/// - `.unifiedToolbar` (variant B, default): tall unified title bar (52 pt). The Umbra header sits in the same row
///   as the traffic lights and the sidebar starts under them, like Window Controls Overlay in Web Umbra.
public enum WindowChrome: String, CaseIterable, Identifiable {
    case transparentTitlebar, unifiedToolbar
    public var id: String { rawValue }

    /// Height of the band the system keeps for the traffic lights.
    public var titlebarHeight: CGFloat {
        switch self {
        case .transparentTitlebar: 28
        case .unifiedToolbar: Layout.headerHeight
        }
    }

    /// Width taken by the traffic lights at the leading edge.
    public static let trafficLightsWidth: CGFloat = 78
}

public extension View {
    /// Configures the hosting `NSWindow` for the chosen chrome: transparent title bar, full-size content,
    /// hidden title, and for `.unifiedToolbar` an empty unified toolbar that makes the title bar tall.
    func umbraWindowChrome(_ chrome: WindowChrome) -> some View {
        background(WindowAccessor { window in WindowChromeApplier.apply(chrome, to: window) })
    }
}

enum WindowChromeApplier {
    @MainActor
    static func apply(_ chrome: WindowChrome, to window: NSWindow) {
        window.titlebarAppearsTransparent = true
        window.titleVisibility = .hidden
        window.styleMask.insert(.fullSizeContentView)
        window.isMovableByWindowBackground = false
        window.backgroundColor = .clear
        window.isOpaque = false
        window.titlebarSeparatorStyle = .none
        switch chrome {
        case .transparentTitlebar:
            window.toolbar = nil
        case .unifiedToolbar:
            if window.toolbar?.identifier != "umbra.chrome" {
                let toolbar = NSToolbar(identifier: "umbra.chrome")
                toolbar.displayMode = .iconOnly
                window.toolbar = toolbar
            }
            window.toolbarStyle = .unified
        }
    }
}

/// Hands the hosting `NSWindow` to a closure once the view is in a window, and again if the window changes.
struct WindowAccessor: NSViewRepresentable {
    let configure: @MainActor (NSWindow) -> Void

    func makeNSView(context: Context) -> AccessorView {
        let view = AccessorView()
        view.configure = configure
        return view
    }

    func updateNSView(_ view: AccessorView, context: Context) {
        view.configure = configure
        if let window = view.window { configure(window) }
    }

    final class AccessorView: NSView {
        var configure: (@MainActor (NSWindow) -> Void)?

        override func viewDidMoveToWindow() {
            super.viewDidMoveToWindow()
            guard let window else { return }
            DispatchQueue.main.async { [weak self] in
                guard self?.window === window else { return }
                self?.configure?(window)
            }
        }
    }
}

/// Empty area that drags the window, for the header band that replaces the title bar.
public struct WindowDragArea: NSViewRepresentable {
    public init() {}

    public func makeNSView(context: Context) -> NSView { DragView() }
    public func updateNSView(_ nsView: NSView, context: Context) {}

    final class DragView: NSView {
        override var mouseDownCanMoveWindow: Bool { true }

        override func mouseDown(with event: NSEvent) {
            if event.clickCount == 2 {
                window?.performZoom(nil)
            } else {
                window?.performDrag(with: event)
            }
        }
    }
}
