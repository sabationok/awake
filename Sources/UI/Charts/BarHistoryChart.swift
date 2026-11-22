import Charts
import SwiftUI

/// Скопійовано з Mia (apps/mac/Sources/UI/Charts), без L10n: підписи українською.
/// A titled bar history like System Settings → Акумулятор: rounded bars per hour or day, light dashed vertical
/// gridlines, solid ones at date markers, weekday / hour labels with the date under them, the scale on the right,
/// and an optional dashed limit line. Stacks when points share a start (`series`); colors per series.
struct BarHistoryChart: View {
    let title: String
    let points: [HistoryPoint]
    let axis: HistoryAxis
    /// Series name → color; a single-series chart uses `color` for "".
    var colors: [String: Color] = [:]
    var color: Color = .green
    var limit: Double?
    var height: CGFloat = 120
    /// Scale and limit labels ("$0.5", "12K").
    var format: (Double) -> String = { $0.formatted(.number.notation(.compactName)) }
    /// Off when the title already sits outside, e.g. as a form section header; the series legend stays.
    var showsTitle = true

    private var starts: [Date] { Array(Set(points.map(\.start))).sorted() }
    private var seriesNames: [String] { points.reduce(into: [String]()) { if !$0.contains($1.series) { $0.append($1.series) } } }
    private var isStacked: Bool { seriesNames.count > 1 }

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            if showsTitle || isStacked {
                HStack(spacing: 10) {
                    if showsTitle { Text(title).font(.headline) }
                    if isStacked {
                        ForEach(seriesNames, id: \.self) { name in
                            HStack(spacing: 4) {
                                RoundedRectangle(cornerRadius: 2).fill(tint(name)).frame(width: 8, height: 8)
                                Text(name).font(.caption).foregroundStyle(.secondary)
                            }
                        }
                    }
                }
            }
            chart.frame(height: height)
        }
    }

    private var chart: some View {
        let first = labeledFirst
        return Chart {
            ForEach(points) { point in
                BarMark(x: .value("Час", point.start, unit: axis.unit), y: .value(title, point.value), width: .ratio(0.62))
                    .foregroundStyle(by: .value("Серія", point.series))
                    .cornerRadius(isStacked ? 2 : 4)
            }
            // All zeros and no limit: an invisible mark keeps a 0…1 scale instead of no axis at all.
            if limit == nil && points.allSatisfy({ $0.value == 0 }) {
                RuleMark(y: .value(title, 1)).foregroundStyle(.clear)
            }
            if let limit {
                RuleMark(y: .value("Ліміт", limit))
                    .foregroundStyle(.red.opacity(0.8))
                    .lineStyle(StrokeStyle(lineWidth: 1, dash: [4, 3]))
                    .annotation(position: .top, alignment: .leading, spacing: 2) {
                        Text("ліміт \(format(limit))").font(.caption2).foregroundStyle(.red.opacity(0.9))
                    }
            }
        }
        .chartForegroundStyleScale(domain: seriesNames, range: seriesNames.map(tint))
        .chartLegend(.hidden)
        .chartXScale(domain: xDomain)
        .chartXAxis {
            AxisMarks(values: starts.filter { $0 == first || axis.shows($0) }) { value in
                if let date = value.as(Date.self) {
                    let marker = axis.isMarker(date, first: first)
                    AxisGridLine(stroke: StrokeStyle(lineWidth: marker ? 0.8 : 0.5, dash: marker ? [] : [2, 3]))
                        .foregroundStyle(Color.secondary.opacity(marker ? 0.6 : 0.4))
                    AxisValueLabel(anchor: .topLeading, collisionResolution: .disabled) {
                        VStack(alignment: .leading, spacing: 6) {
                            Text(axis.label(date)).font(.caption)
                            Text(marker ? axis.marker(date) : " ").font(.caption)
                        }
                        .padding(.leading, 3)
                    }
                }
            }
        }
        .chartYAxis {
            AxisMarks(position: .trailing, values: .automatic(desiredCount: 3)) { value in
                AxisGridLine(stroke: StrokeStyle(lineWidth: 0.5)).foregroundStyle(Color.secondary.opacity(0.5))
                AxisValueLabel {
                    if let v = value.as(Double.self) { Text(format(v)).font(.caption) }
                }
            }
        }
    }

    /// The first bucket gets a date marker unless a natural one (new day / week) follows within 3 buckets,
    /// where the two dates would overlap.
    private var labeledFirst: Date? {
        guard let first = starts.first else { return nil }
        let soon = starts.dropFirst().prefix(3)
        return soon.contains { axis.isMarker($0, first: nil) } ? nil : first
    }

    /// The whole window, so the last bar is not cut and an empty window still shows its axis.
    private var xDomain: ClosedRange<Date> {
        guard let first = starts.first, let last = starts.last else { return Date()...Date().addingTimeInterval(1) }
        return first...(axis.calendar.date(byAdding: axis.unit, value: 1, to: last) ?? last)
    }

    private func tint(_ series: String) -> Color { colors[series] ?? color }
}
