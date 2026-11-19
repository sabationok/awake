import Foundation

enum Countdown {
    /// 59:59 або 7:59:59.
    static func string(until end: Date, now: Date) -> String {
        let s = max(0, Int(end.timeIntervalSince(now)))
        return s >= 3600
            ? String(format: "%d:%02d:%02d", s / 3600, s % 3600 / 60, s % 60)
            : String(format: "%02d:%02d", s / 60, s % 60)
    }
}
