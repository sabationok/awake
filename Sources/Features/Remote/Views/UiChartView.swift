import SwiftUI

/// Вузол `chart` агента → BarHistoryChart: точки, вісь за розміром бакета, кольори з тонів.
struct UiChartView: View {
    let chart: UiChart

    var body: some View {
        BarHistoryChart(
            title: chart.title,
            points: chart.points.map { HistoryPoint(start: $0.start, value: $0.value, series: $0.series ?? "") },
            axis: HistoryAxis(unit: Self.unit(chart.unit)),
            colors: (chart.tones ?? [:]).mapValues(\.color),
            color: chart.tone?.color ?? .accentColor,
            limit: chart.limit,
            format: chart.format == .duration ? Self.duration : Self.count
        )
        .padding(.vertical, 4)
    }

    private static func unit(_ unit: UiChart.Unit) -> Calendar.Component {
        switch unit {
        case .hour: .hour
        case .day: .day
        case .week: .weekOfYear
        case .month: .month
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
