import AppKit

/// `--perf <page>`: an offscreen timing run against the running server (R1: it only reads the socket, it never
/// sends). It switches the page's period tabs locally and replays the last tree the server pushed (the echo after a
/// `.setting`), timing the decode, the SwiftUI update + layout, and the draw of each step. Prints one line per step
/// and a summary, then exits. Nothing reaches the owner's screen: the window is never ordered in.
@MainActor
enum PerfProbe {
    static let tabSwitch = Notification.Name("macontrol.perf.tab")

    static func now() -> Double { CFAbsoluteTimeGetCurrent() * 1000 }

    /// Update + layout, then a full draw of the window's view tree. Milliseconds.
    static func settle(_ view: NSView) -> (layout: Double, draw: Double) {
        let t0 = now()
        view.layoutSubtreeIfNeeded()
        let t1 = now()
        if let rep = view.bitmapImageRepForCachingDisplay(in: view.bounds) { view.cacheDisplay(in: view.bounds, to: rep) }
        return (t1 - t0, now() - t1)
    }

    static func run(server: ServerConnection, window: NSWindow, rounds: Int = 3) async {
        guard let view = window.contentView?.superview ?? window.contentView else { exit(3) }
        for _ in 0..<60 where server.lastTreeLine == nil { try? await Task.sleep(nanoseconds: 100_000_000) }
        guard server.lastTreeLine != nil else { print("perf: no tree from the server"); exit(3) }
        try? await Task.sleep(nanoseconds: 500_000_000)
        _ = settle(view)
        _ = settle(view)

        var switches: [Double] = []
        var echoes: [Double] = []
        let tabs = ["today", "days", "weeks", "months"]
        for round in 0..<rounds {
            for tab in tabs {
                let t0 = now()
                NotificationCenter.default.post(name: tabSwitch, object: tab)
                let s = settle(view)
                let total = now() - t0
                switches.append(total)
                print(String(format: "switch r%d %-6@ layout %6.1f  draw %6.1f  total %6.1f ms",
                             round, tab, s.layout, s.draw, total))

                let e0 = now()
                let decode = server.replayLast()
                let e = settle(view)
                let etotal = now() - e0
                echoes.append(etotal)
                print(String(format: "echo   r%d %-6@ decode %6.1f  layout %6.1f  draw %6.1f  total %6.1f ms",
                             round, tab, decode, e.layout, e.draw, etotal))
            }
        }
        func median(_ a: [Double]) -> Double { let s = a.sorted(); return s[s.count / 2] }
        print(String(format: "SUMMARY switch median %.1f max %.1f | echo median %.1f max %.1f | tree %d bytes",
                     median(switches), switches.max() ?? 0, median(echoes), echoes.max() ?? 0,
                     server.lastTreeLine?.count ?? 0))
        exit(0)
    }
}
