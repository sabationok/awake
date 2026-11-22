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
        charts = charts.map { chart in tick.points[chart.id].map { chart.merging($0, from: tick.from) } ?? chart }
    }
}

/// Поточний бакет кожного графіка (`serverChartsTick`): id графіка → точки серій.
struct AgentServerChartsTick: Decodable {
    let period: ServerChartsPeriod
    let from: Date
    let points: [String: [UiChart.Point]]
}
