import Foundation

/// Графіки «Сервера» за період від агента (`serverCharts`).
struct AgentServerCharts: Decodable, Equatable {
    let period: StatsPeriod
    let from: Date
    let to: Date
    var charts: [UiChart]

    /// Live-тік (`UiChart.merging`): поточний бакет замінює бакет з тим самим початком або дописується; усе раніше `from` відпадає.
    mutating func apply(_ tick: AgentServerChartsTick) {
        guard tick.period == period else { return }
        charts = charts.map { chart in tick.points[chart.id].map { chart.merging($0, from: tick.from) } ?? chart }
    }
}

/// Поточний бакет кожного графіка (`serverChartsTick`): id графіка → точки серій.
struct AgentServerChartsTick: Decodable {
    let period: StatsPeriod
    let from: Date
    let points: [String: [UiChart.Point]]
}
