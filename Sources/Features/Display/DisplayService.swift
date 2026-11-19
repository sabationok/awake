import CoreGraphics
import Foundation

/// Гасіння екрана. Root не потрібен.
enum DisplayService {
    /// Секунди від останнього руху миші чи натискання клавіші.
    static func idleSeconds() -> TimeInterval {
        guard let anyInput = CGEventType(rawValue: ~0) else { return 0 }
        return CGEventSource.secondsSinceLastEventType(.combinedSessionState, eventType: anyInput)
    }

    static func sleepNow() {
        _ = Shell.run("/usr/bin/pmset", ["displaysleepnow"])
    }
}

/// Гасить екран один раз за кожен період бездіяльності.
struct IdleDisplayDimmer {
    private var fired = false

    mutating func update(limit: Int?) {
        guard let limit else { return }
        let idle = DisplayService.idleSeconds()
        if idle < 2 { fired = false }
        if !fired && idle >= Double(limit) {
            fired = true
            DisplayService.sleepNow()
        }
    }
}
