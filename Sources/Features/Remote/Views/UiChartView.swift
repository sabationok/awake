import SwiftUI

/// Вузол `chart` агента → BarHistoryChart: точки, вісь за розміром бакета, кольори з тонів.
struct UiChartView: View {
    let chart: UiChart
    /// Висота стовпчиків; менша — для графіка всередині картки.
    var height: CGFloat = 120

    var body: some View {
        BarHistoryChart(
            title: chart.title,
            points: chart.points.map { HistoryPoint(start: $0.start, value: $0.value, series: $0.series ?? "") },
            axis: HistoryAxis(unit: Self.unit(chart.unit)),
            colors: (chart.tones ?? [:]).mapValues(\.color),
            color: chart.tone?.color ?? .accentColor,
            limit: chart.limit,
            height: height,
            format: Self.formatter(chart.format)
        )
        .padding(.vertical, 4)
    }

    private static func unit(_ unit: UiChart.Unit) -> Calendar.Component {
        switch unit {
        case .minute: .minute
        case .hour: .hour
        case .day: .day
        case .week: .weekOfYear
        case .month: .month
        }
    }

    private static func formatter(_ format: UiChart.Format?) -> (Double) -> String {
        switch format {
        case .duration: duration
        case .bytes: { ByteCountFormatter.string(fromByteCount: Int64($0), countStyle: .memory) }
        case .percent: { "\($0.formatted(.number.precision(.fractionLength(0...1)))) %" }
        case .number: { $0.formatted(.number.precision(.fractionLength(0...2))) }
        case .count, nil: count
        }
    }

    private static func count(_ value: Double) -> String {
        value.formatted(.number.notation(.compactName))
    }

    /// Секунди → «3 год» / «40 хв».
    private static func duration(_ seconds: Double) -> String {
        seconds >= 3600 ? "\((seconds / 3600).formatted(.number.precision(.fractionLength(0...1)))) год"
            : "\(Int(seconds / 60)) хв"
    }
}
