import Foundation
import SwiftUI

/// `chart` node: Umbra bar chart with the web's labels (`formatBucket`, `formatValue` in web-umbra node-view).
struct ChartNode: View {
    let chart: UiChart

    var body: some View {
        UmbraChart(chart.title,
                   points: chart.points.map { UmbraChartPoint(start: $0.start, value: $0.value, series: $0.series ?? "") },
                   tone: chart.tone?.umbra ?? .accent,
                   tones: (chart.tones ?? [:]).mapValues(\.umbra),
                   limit: chart.limit,
                   bucketLabel: { ChartLabels.bucket($0, unit: chart.unit) },
                   valueLabel: { ChartLabels.value($0, format: chart.format) })
    }
}

enum ChartLabels {
    private static let locale = Locale(identifier: "uk_UA")

    private static func formatter(_ template: String) -> DateFormatter {
        let f = DateFormatter()
        f.locale = locale
        f.setLocalizedDateFormatFromTemplate(template)
        return f
    }

    private static let time = formatter("HH:mm")
    private static let month = formatter("LLL")
    private static let day = formatter("d MMM")

    static func bucket(_ date: Date, unit: UiChart.Unit) -> String {
        switch unit {
        case .minute, .hour: time.string(from: date)
        case .month: month.string(from: date)
        case .day, .week: day.string(from: date)
        }
    }

    static func value(_ v: Double, format: UiChart.Format?) -> String {
        switch format {
        case .duration:
            let h = Int(v / 3600), m = Int(((v.truncatingRemainder(dividingBy: 3600)) / 60).rounded())
            return h > 0 ? "\(h) год \(m) хв" : "\(m) хв"
        case .bytes: return v > 1e6 ? String(format: "%.1f МБ", v / 1e6) : "\(Int((v / 1e3).rounded())) КБ"
        case .percent: return "\(Int(v.rounded()))%"
        case .number: return String(format: "%.1f", v)
        case .count, nil: return "\(Int(v.rounded()))"
        }
    }
}
