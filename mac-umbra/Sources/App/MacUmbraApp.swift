import AppKit
import SwiftUI

/// `--page <id> --snapshot <png> --render --width N --height N` for scripted screenshots.
struct LaunchOptions {
    var page: String?
    var snapshot: String?
    var render = false
    var width: CGFloat = 1180
    var height: CGFloat = 800

    static let current: LaunchOptions = {
        var o = LaunchOptions()
        var args = CommandLine.arguments.dropFirst().makeIterator()
        while let arg = args.next() {
            switch arg {
            case "--page": o.page = args.next()
            case "--snapshot": o.snapshot = args.next()
            case "--render": o.render = true
            case "--width": o.width = args.next().flatMap(Double.init).map { CGFloat($0) } ?? o.width
            case "--height": o.height = args.next().flatMap(Double.init).map { CGFloat($0) } ?? o.height
            default: break
            }
        }
        return o
    }()
}

@main
struct MacUmbraApp: App {
    @NSApplicationDelegateAdaptor(MacUmbraDelegate.self) private var delegate
    var body: some Scene { Settings { EmptyView() } }
}

@MainActor
final class MacUmbraDelegate: NSObject, NSApplicationDelegate {
    private var window: NSWindow?
    private let server = ServerConnection()

    func applicationDidFinishLaunching(_ notification: Notification) {
        NSApp.setActivationPolicy(.regular)
        let o = LaunchOptions.current
        server.start()
        let window = NSWindow(
            contentRect: NSRect(x: 0, y: 0, width: o.width, height: o.height),
            styleMask: [.titled, .closable, .miniaturizable, .resizable, .fullSizeContentView],
            backing: .buffered, defer: false)
        window.title = "MaControl Umbra"
        // Dark before the first layout: a later switch leaves SF Symbols shifted.
        window.appearance = NSAppearance(named: .darkAqua)
        window.minSize = NSSize(width: 420, height: 480)
        window.isReleasedWhenClosed = false
        window.contentView = NSHostingView(rootView: TreeRoot(server: server, options: o))
        window.center()
        window.makeKeyAndOrderFront(nil)
        self.window = window
        NSApp.activate(ignoringOtherApps: true)
        if let path = o.snapshot {
            DispatchQueue.main.asyncAfter(deadline: .now() + 3.0) {
                guard let view = window.contentView?.superview ?? window.contentView,
                      let rep = view.bitmapImageRepForCachingDisplay(in: view.bounds) else { exit(3) }
                view.cacheDisplay(in: view.bounds, to: rep)
                let ok = rep.representation(using: .png, properties: [:])
                    .map { (try? $0.write(to: URL(fileURLWithPath: path))) != nil } ?? false
                exit(ok ? 0 : 3)
            }
        }
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool { true }
}
