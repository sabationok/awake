import SwiftUI

/// CSS `grid-template-columns: repeat(auto-fit, minmax(<minimum>, 1fr))`: as many equal columns as fit at
/// `minimum`, but never more than there are items, so one or two items stretch over the whole width (SwiftUI's
/// `GridItem(.adaptive)` keeps the empty columns and leaves the items narrow). Items wrap to the next line.
public struct FitGrid: Layout {
    public var minimum: CGFloat
    public var spacing: CGFloat

    public init(minimum: CGFloat = 120, spacing: CGFloat = 8) {
        self.minimum = minimum
        self.spacing = spacing
    }

    private func columns(_ width: CGFloat, _ count: Int) -> Int {
        let fit = max(1, Int((width + spacing) / (minimum + spacing)))
        return max(1, min(fit, count))
    }

    private func columnWidth(_ width: CGFloat, _ cols: Int) -> CGFloat {
        (width - spacing * CGFloat(cols - 1)) / CGFloat(cols)
    }

    private func rowHeights(_ subviews: Subviews, _ cols: Int, _ colWidth: CGFloat) -> [CGFloat] {
        stride(from: 0, to: subviews.count, by: cols).map { start in
            subviews[start..<min(start + cols, subviews.count)]
                .map { $0.sizeThatFits(ProposedViewSize(width: colWidth, height: nil)).height }.max() ?? 0
        }
    }

    public func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        guard !subviews.isEmpty else { return .zero }
        let width = proposal.width ?? minimum * CGFloat(subviews.count) + spacing * CGFloat(subviews.count - 1)
        let cols = columns(width, subviews.count)
        let heights = rowHeights(subviews, cols, columnWidth(width, cols))
        return CGSize(width: width, height: heights.reduce(0, +) + spacing * CGFloat(heights.count - 1))
    }

    public func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        guard !subviews.isEmpty else { return }
        let cols = columns(bounds.width, subviews.count)
        let colWidth = columnWidth(bounds.width, cols)
        let heights = rowHeights(subviews, cols, colWidth)
        var y = bounds.minY
        for (row, height) in heights.enumerated() {
            for col in 0..<cols {
                let i = row * cols + col
                guard i < subviews.count else { break }
                subviews[i].place(at: CGPoint(x: bounds.minX + CGFloat(col) * (colWidth + spacing), y: y),
                                  proposal: ProposedViewSize(width: colWidth, height: height))
            }
            y += height + spacing
        }
    }
}
