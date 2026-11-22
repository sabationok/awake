import Foundation

/// One bar (or one stacked segment of a bar) of a `BarHistoryChart`: the bucket's start and its value.
/// Points with the same `start` and different `series` stack in that order.
struct HistoryPoint: Hashable, Identifiable {
    let start: Date
    let value: Double
    var series = ""

    var id: String { "\(start.timeIntervalSince1970)|\(series)" }
}
