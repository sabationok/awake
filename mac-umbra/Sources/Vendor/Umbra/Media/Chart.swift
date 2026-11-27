import Charts
import SwiftUI

/// One bar (or a segment of a stacked bar): bucket start, value, series ("" for a single series).
public struct ChartPoint: Hashable {
    public var start: Date
    public var value: Double
    public var series: String

    public init(start: Date, value: Double, series: String = "") {
        self.start = start
        self.value = value
        self.series = series
    }
}

/// Bar chart over time (`.u-chart`): title with the hovered (or last) bucket and its total on the right, bars 120 pt
/// high with hairlines at 25 / 50 / 75 %, an optional dashed limit, the first and last bucket under the bars and a
/// legend for stacked series. The host formats bucket labels and values; the chart only draws.
public struct Chart: View {
    private let title: String
    private let points: [ChartPoint]
    private let tones: [String: Tone]
    private let tone: Tone
    private let limit: Double?
    private let bucketLabel: (Date) -> String
    private let valueLabel: (Double) -> String
    @State private var hover: Int?
    @Environment(\.umbra) private var theme

    private static let fallback: [Tone] = [.accent, .indigo, .green, .yellow, .red]

    public init(_ title: String, points: [ChartPoint], tone: Tone = .accent, tones: [String: Tone] = [:],
                limit: Double? = nil, bucketLabel: @escaping (Date) -> String,
                valueLabel: @escaping (Double) -> String) {
        self.title = title
        self.points = points
        self.tone = tone
        self.tones = tones
        self.limit = limit
        self.bucketLabel = bucketLabel
        self.valueLabel = valueLabel
    }

    private var starts: [Date] { Array(Set(points.map(\.start))).sorted() }
    private var series: [String] {
        var seen: [String] = []
        for p in points where !seen.contains(p.series) { seen.append(p.series) }
        return seen
    }

    private func toneOf(_ s: String, in series: [String]) -> Tone {
        if let t = tones[s] { return t }
        guard !s.isEmpty, let i = series.firstIndex(of: s) else { return tone }
        return Self.fallback[i % Self.fallback.count]
    }

    private static func totals(_ points: [ChartPoint], _ index: [Date: Int], _ count: Int) -> [Double] {
        var sums = [Double](repeating: 0, count: count)
        for point in points { if let i = index[point.start] { sums[i] += point.value } }
        return sums
    }

    public var body: some View {
        let p = theme.palette
        let starts = starts
        let index = Dictionary(uniqueKeysWithValues: starts.enumerated().map { ($1, $0) })
        // One pass over the points (was a filter per bucket); series once, not per bar.
        let totals = Self.totals(points, index, starts.count)
        let top = max(1, limit ?? 0, totals.max() ?? 0) * 1.04
        let shown = hover ?? (starts.isEmpty ? nil : starts.count - 1)
        let series = series

        VStack(alignment: .leading, spacing: 10) {
            HStack(alignment: .firstTextBaseline, spacing: 10) {
                Text(title).font(.system(size: 13, weight: .semibold)).foregroundStyle(p.fg)
                Spacer(minLength: 0)
                Text(shown.map { "\(bucketLabel(starts[$0])) · \(valueLabel(totals[$0]))" }
                     ?? valueLabel(totals.reduce(0, +)))
                    .font(Font.xs.monospacedDigit())
                    .foregroundStyle(p.fg3)
            }
            Charts.Chart {
                ForEach([0.25, 0.5, 0.75], id: \.self) { f in
                    RuleMark(y: .value("grid", top * f))
                        .lineStyle(StrokeStyle(lineWidth: 0.5))
                        .foregroundStyle(p.line)
                }
                ForEach(points, id: \.self) { point in
                    let i = index[point.start] ?? 0
                    BarMark(x: .value("bucket", String(i)), y: .value("value", point.value), width: .ratio(0.62))
                        .foregroundStyle(toneOf(point.series, in: series).color(p))
                        .cornerRadius(1.5)
                        .opacity(hover == nil || hover == i ? 1 : 0.45)
                }
                if let limit {
                    RuleMark(y: .value("limit", limit))
                        .lineStyle(StrokeStyle(lineWidth: 1, dash: [3, 3]))
                        .foregroundStyle(p.danger)
                }
            }
            .chartXScale(domain: starts.indices.map(String.init))
            .chartYScale(domain: 0...top)
            .chartXAxis(.hidden)
            .chartYAxis(.hidden)
            .chartLegend(.hidden)
            .chartOverlay { proxy in
                Rectangle().fill(.clear).contentShape(Rectangle())
                    .onContinuousHover { phase in
                        switch phase {
                        case .active(let at): hover = proxy.value(atX: at.x, as: String.self).flatMap(Int.init)
                        case .ended: hover = nil
                        }
                    }
            }
            .frame(height: 120)
            .accessibilityLabel(title)
            HStack {
                Text(starts.first.map(bucketLabel) ?? "")
                Spacer()
                Text(starts.last.map(bucketLabel) ?? "")
            }
            .font(.system(size: 10).monospacedDigit())
            .foregroundStyle(p.fg3)
            if series.count > 1 {
                HStack(spacing: 12) {
                    ForEach(series, id: \.self) { s in
                        HStack(spacing: 6) {
                            Circle().fill(toneOf(s, in: series).color(p)).frame(width: 7, height: 7)
                            Text(s)
                        }
                    }
                }
                .font(Font.xs)
                .foregroundStyle(p.fg2)
            }
        }
        .padding(14)
    }
}

/// `Chart`'s frame with `Skeleton` in place of the bars and the bucket labels: the title is real, the
/// height is the chart's, so the page does not jump when the chart replaces it.
public struct ChartSkeleton: View {
    private let title: String
    @Environment(\.umbra) private var theme

    public init(_ title: String) { self.title = title }

    public var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(alignment: .firstTextBaseline, spacing: 10) {
                Text(title).font(.system(size: 13, weight: .semibold)).foregroundStyle(theme.palette.fg)
                Spacer(minLength: 0)
                Skeleton(height: 10, width: 72)
            }
            Skeleton(height: 120)
            HStack {
                Skeleton(height: 8, width: 36)
                Spacer()
                Skeleton(height: 8, width: 36)
            }
            .frame(height: 13)
        }
        .padding(14)
    }
}
