import Foundation

/// Live-тік графіків SDUI-дерева (`chartTick`, `ChartTick` у contracts): id вузла `chart` → поточний бакет.
struct UiChartTick: Decodable {
    let from: Date
    let points: [String: [UiChart.Point]]
}

extension UiChart {
    /// Live-тік: точки з тим самим початком і серією замінюються свіжими, нові дописуються; усе раніше `from`
    /// відпадає (вікно «Година» зсувається). Спільне для графіків «Сервера» і дерева.
    func merging(_ fresh: [Point], from: Date) -> UiChart {
        guard !fresh.isEmpty else { return self }
        let replaced = Set(fresh.map { PointKey(start: $0.start, series: $0.series ?? "") })
        var updated = self
        updated.points = (points.filter { $0.start >= from && !replaced.contains(PointKey(start: $0.start, series: $0.series ?? "")) } + fresh)
            .enumerated()
            .sorted { $0.element.start == $1.element.start ? $0.offset < $1.offset : $0.element.start < $1.element.start }
            .map(\.element)
        return updated
    }

    private struct PointKey: Hashable {
        let start: Date
        let series: String
    }
}

extension UiTree {
    /// Тік у кожен вузол `chart` з його id, де б він не був (секції, вкладки).
    mutating func apply(_ tick: UiChartTick) {
        pages = pages.map { page in
            var page = page
            page.children = page.children.map { $0.applying(tick) }
            return page
        }
    }
}

private extension UiNode {
    func applying(_ tick: UiChartTick) -> UiNode {
        switch self {
        case .chart(let chart):
            guard let fresh = tick.points[chart.id] else { return self }
            return .chart(chart.merging(fresh, from: tick.from))
        case .section(var section):
            section.children = section.children.map { $0.applying(tick) }
            return .section(section)
        case .tabs(let id, let tabs, let value, let setting):
            let updated = tabs.map { tab in
                var tab = tab
                tab.children = tab.children.map { $0.applying(tick) }
                return tab
            }
            return .tabs(id: id, tabs: updated, value: value, setting: setting)
        default:
            return self
        }
    }
}
