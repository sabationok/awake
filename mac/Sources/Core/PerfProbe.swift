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
    /// `PERF_SHOT=<dir>`: also writes each drawn frame of round 0 as `<dir>/<name>.png` (to look at the skeleton).
    static func settle(_ view: NSView, shot name: String? = nil) -> (layout: Double, draw: Double) {
        let t0 = now()
        view.layoutSubtreeIfNeeded()
        let t1 = now()
        let rep = view.bitmapImageRepForCachingDisplay(in: view.bounds)
        if let rep { view.cacheDisplay(in: view.bounds, to: rep) }
        let t2 = now()
        if let name, let dir = ProcessInfo.processInfo.environment["PERF_SHOT"], let png = rep?.representation(using: .png, properties: [:]) {
            try? png.write(to: URL(fileURLWithPath: dir).appendingPathComponent("\(name).png"))
        }
        return (t1 - t0, t2 - t1)
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
        var builds: [Double] = []
        var updates: [Double] = []
        let tabs = ["today", "days", "weeks", "months"]
        for round in 0..<rounds {
            for tab in tabs {
                // Frame 1: thumb + the new tab's sections with chart skeletons. Frame 2: the charts are built.
                let t0 = now()
                NotificationCenter.default.post(name: tabSwitch, object: tab)
                // One runloop turn so SwiftUI commits the state change (well under the 1/60 s chart delay).
                let y0 = now()
                try? await Task.sleep(nanoseconds: 2_000_000)
                let update = now() - y0 - 2
                let s = settle(view, shot: round == 0 ? "\(tab)-1-skeleton" : nil)
                let total = now() - t0
                switches.append(total)
                let c0 = now()
                try? await Task.sleep(nanoseconds: 40_000_000)
                let build = max(0, now() - c0 - 40)
                let b = settle(view, shot: round == 0 ? "\(tab)-2-charts" : nil)
                builds.append(build + b.layout)
                updates.append(update + s.layout)
                print(String(format: "switch r%d %-6@ update %6.1f  draw %6.1f  total %6.1f ms | charts update %6.1f  draw %6.1f",
                             round, tab, update + s.layout, s.draw, total, build + b.layout, b.draw))

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
        print(String(format: "SUMMARY switch update median %.1f | switch median %.1f max %.1f | charts update median %.1f | echo median %.1f max %.1f | tree %d bytes",
                     median(updates), median(switches), switches.max() ?? 0, median(builds), median(echoes), echoes.max() ?? 0,
                     server.lastTreeLine?.count ?? 0))
        exit(0)
    }
}
