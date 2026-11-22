import Foundation

/// Період графіків «Сервера» (`StatsPeriod` у contracts): бакет обирає агент.
enum ServerChartsPeriod: String, CaseIterable, Identifiable, Codable {
    case hour, today, week, month

    var id: String { rawValue }

    var title: String {
        switch self {
        case .hour: "Година"
        case .today: "Сьогодні"
        case .week: "7 днів"
        case .month: "30 днів"
        }
    }
}

/// Графіки «Сервера» за період від агента (`serverCharts`).
struct AgentServerCharts: Decodable, Equatable {
    let period: ServerChartsPeriod
    let from: Date
    let to: Date
    var charts: [UiChart]

    /// Live-тік: поточний бакет замінює бакет з тим самим початком або дописується; усе раніше `from` відпадає.
    mutating func apply(_ tick: AgentServerChartsTick) {
        guard tick.period == period else { return }
        charts = charts.map { chart in
            guard let fresh = tick.points[chart.id], let start = fresh.first?.start else { return chart }
            var updated = chart
            updated.points = chart.points.filter { $0.start != start && $0.start >= tick.from } + fresh
            return updated
        }
    }
}

/// Поточний бакет кожного графіка (`serverChartsTick`): id графіка → точки серій.
struct AgentServerChartsTick: Decodable {
    let period: ServerChartsPeriod
    let from: Date
    let points: [String: [UiChart.Point]]
}
