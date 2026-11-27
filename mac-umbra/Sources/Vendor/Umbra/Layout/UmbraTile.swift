import SwiftUI

/// Comparison with the previous period, as the server sends it (`UiRow.compare`).
public struct UmbraCompare: Equatable {
    public enum GoodWhen { case up, down }

    /// Change in percent; nil means there was nothing before («нове»).
    public var deltaPct: Double?
    /// Previous value, already formatted.
    public var previous: String
    /// Which direction is good; nil keeps the change neutral.
    public var goodWhen: GoodWhen?

    public init(deltaPct: Double?, previous: String, goodWhen: GoodWhen? = nil) {
        self.deltaPct = deltaPct
        self.previous = previous
        self.goodWhen = goodWhen
    }

    enum Mood { case good, bad, flat }

    var mood: Mood {
        guard let deltaPct, deltaPct != 0, let goodWhen else { return .flat }
        return (deltaPct > 0) == (goodWhen == .up) ? .good : .bad
    }

    func deltaText(newText: String) -> String {
        guard let deltaPct else { return newText }
        let arrow = deltaPct > 0 ? "↑" : deltaPct < 0 ? "↓" : ""
        return "\(arrow)\(Int(abs(deltaPct).rounded()))%"
    }
}

/// Summary tile (`.u-tile`): big value, optional compare line, label at the bottom (two lines max).
public struct UmbraTile: View {
    private let value: String
    private let label: String
    private let compare: UmbraCompare?
    private let previousPrefix: String
    private let newText: String
    @Environment(\.umbra) private var theme

    public init(value: String, label: String, compare: UmbraCompare? = nil,
                previousPrefix: String = "минулий:", newText: String = "нове") {
        self.value = value
        self.label = label
        self.compare = compare
        self.previousPrefix = previousPrefix
        self.newText = newText
    }

    public var body: some View {
        let p = theme.palette
        VStack(alignment: .leading, spacing: 4) {
            Text(value)
                .font(.system(size: 22, weight: .semibold).monospacedDigit())
                .tracking(-0.2)
                .foregroundStyle(p.fg)
                .lineLimit(1)
                .minimumScaleFactor(0.6)
            if let compare {
                let color: Color = switch compare.mood {
                case .good: p.ok
                case .bad: p.danger
                case .flat: p.fg3
                }
                HStack(alignment: .firstTextBaseline, spacing: 6) {
                    Text(compare.deltaText(newText: newText)).foregroundStyle(color)
                    Text("\(previousPrefix) \(compare.previous)").foregroundStyle(p.fg3)
                }
                .font(.system(size: 11).monospacedDigit())
                .lineLimit(1)
            }
            Spacer(minLength: 0)
            Text(label)
                .font(.system(size: 11))
                .foregroundStyle(p.fg3)
                .lineLimit(2)
                .padding(.top, 4)
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 12)
        .frame(maxWidth: .infinity, minHeight: 92, alignment: .topLeading)
        .umbraSurface(.panel)
        .accessibilityElement(children: .combine)
    }
}

/// Grid of tiles (`.u-tiles`): as many 150 pt+ columns as fit.
public struct UmbraTiles<Content: View>: View {
    private let content: Content

    public init(@ViewBuilder content: () -> Content) {
        self.content = content()
    }

    public var body: some View {
        LazyVGrid(columns: [GridItem(.adaptive(minimum: 150), spacing: 8)], spacing: 8) { content }
    }
}
