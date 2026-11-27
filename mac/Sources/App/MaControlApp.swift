import AppKit
import SwiftUI

/// `--page <id> --snapshot <png> --render --width N --height N [--tree <json>]` for scripted screenshots.
/// `--tree` renders a saved tree (the parity script passes the one the web shows) instead of the socket's.
/// `--dev-build <json>` reads the dev passport from a file (the bare snapshot binary has no bundle resources);
/// `--dev-indicator floating|panel|strip` forces the indicator's state for a shot.
/// `--translucent --wallpaper <png>` keeps the window materials in a render and draws them over that image
/// (offscreen there is no desktop behind the window), to compare the sidebar and content tints on a shot.
/// `--theme system|light|dark` overrides the stored client theme for a shot (nothing is written).
/// `--perf <page>` times period-tab switches and the server's tree echo on that page offscreen (`PerfProbe`).
struct LaunchOptions {
    var page: String?
    var snapshot: String?
    var tree: String?
    var render = false
    var devBuild: String?
    var devIndicator: String?
    var translucent = false
    var wallpaper: String?
    var theme: String?
    var perf: String?
    var width: CGFloat = 1180
    var height: CGFloat = 800

    static let current: LaunchOptions = {
        var o = LaunchOptions()
        var args = CommandLine.arguments.dropFirst().makeIterator()
        while let arg = args.next() {
            switch arg {
            case "--page": o.page = args.next()
            case "--snapshot": o.snapshot = args.next()
            case "--tree": o.tree = args.next()
            case "--render": o.render = true
            case "--dev-build": o.devBuild = args.next()
            case "--dev-indicator": o.devIndicator = args.next()
            case "--translucent": o.translucent = true
            case "--wallpaper": o.wallpaper = args.next()
            case "--theme": o.theme = args.next()
            case "--perf": o.perf = args.next()
            case "--width": o.width = args.next().flatMap(Double.init).map { CGFloat($0) } ?? o.width
            case "--height": o.height = args.next().flatMap(Double.init).map { CGFloat($0) } ?? o.height
            default: break
            }
        }
        return o
    }()
}

enum AppInfo {
    /// Variant display name: `<Product> (<Variant>)`.
    static let displayName = Bundle.main.object(forInfoDictionaryKey: "CFBundleDisplayName") as? String
        ?? "MaControl (Dev)"

    /// The dev passport `Resources/dev-build.json` written by the build (`gen-dev-build.mjs`), or `--dev-build`.
    static func devBuild(_ o: LaunchOptions) -> DevBuild? {
        if let file = o.devBuild { return try? DevBuild.load(url: URL(fileURLWithPath: file)) }
        return DevBuild.load()
    }

    /// `--dev-indicator` for shots: nil in normal runs (mode and corner come from UserDefaults).
    static func devPreview(_ o: LaunchOptions) -> DevIndicatorPreview? {
        switch o.devIndicator {
        case "floating": DevIndicatorPreview(mode: .floating)
        case "panel": DevIndicatorPreview(mode: .floating, panelOpen: true)
        case "strip": DevIndicatorPreview(mode: .strip)
        default: nil
        }
    }
}

@main
struct MaControlApp: App {
    @NSApplicationDelegateAdaptor(MaControlDelegate.self) private var delegate
    var body: some Scene { Settings { EmptyView() } }
}

@MainActor
final class MaControlDelegate: NSObject, NSApplicationDelegate {
    private var window: NSWindow?
    private let server = ServerConnection()

    func applicationDidFinishLaunching(_ notification: Notification) {
        let o = LaunchOptions.current
        if o.perf != nil {
            perf(o)
            return
        }
        if o.snapshot != nil {
            snapshot(o)
            return
        }
        NSApp.setActivationPolicy(.regular)
        server.start()
        let window = makeWindow(o)
        window.center()
        window.makeKeyAndOrderFront(nil)
        self.window = window
        NSApp.activate(ignoringOtherApps: true)
    }

    private func makeWindow(_ o: LaunchOptions) -> NSWindow {
        let window = NSWindow(
            contentRect: NSRect(x: 0, y: 0, width: o.width, height: o.height),
            styleMask: [.titled, .closable, .miniaturizable, .resizable, .fullSizeContentView],
            backing: .buffered, defer: false)
        window.title = AppInfo.displayName
        // The theme's appearance before the first layout: a later switch leaves SF Symbols shifted.
        NSApp.appearance = (o.theme.flatMap(ThemeChoice.init(rawValue:))
            ?? ThemeChoice.stored(UserDefaults.standard.string(forKey: ThemeChoice.key))).appearance
        window.minSize = NSSize(width: 420, height: 480)
        window.isReleasedWhenClosed = false
        window.contentView = NSHostingView(rootView: AppShell(server: server, options: o))
        return window
    }

    /// Scripted screenshot that never reaches the owner's screen: no Dock icon, no activation, the window is never
    /// ordered in. It only reads the running server's socket (R1) and draws the window's view tree into a PNG.
    private func snapshot(_ o: LaunchOptions) {
        NSApp.setActivationPolicy(.prohibited)
        if let file = o.tree { server.load(file: file) } else { server.start(launch: false) }
        let window = makeWindow(o)
        window.setFrameOrigin(NSPoint(x: -30000, y: -30000))
        self.window = window
        DispatchQueue.main.asyncAfter(deadline: .now() + 3.0) {
            guard let view = window.contentView?.superview ?? window.contentView else { exit(3) }
            view.layoutSubtreeIfNeeded()
            guard let rep = view.bitmapImageRepForCachingDisplay(in: view.bounds) else { exit(3) }
            view.cacheDisplay(in: view.bounds, to: rep)
            let ok = rep.representation(using: .png, properties: [:])
                .map { (try? $0.write(to: URL(fileURLWithPath: o.snapshot!))) != nil } ?? false
            exit(ok ? 0 : 3)
        }
    }

    /// `--perf`: like `snapshot`, offscreen and read-only on the socket, then `PerfProbe` times the page.
    private func perf(_ o: LaunchOptions) {
        NSApp.setActivationPolicy(.prohibited)
        var o = o
        o.page = o.perf
        o.render = true
        o.translucent = true
        server.start(launch: false)
        let window = makeWindow(o)
        window.setFrameOrigin(NSPoint(x: -30000, y: -30000))
        self.window = window
        Task { @MainActor in await PerfProbe.run(server: server, window: window) }
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool { true }
}
