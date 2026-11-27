import SwiftUI

/// Item card row (`.u-item`): head (icon, title, then trailing: status, control, actions), tags, a one-line copy
/// field, a muted comment. 14 pt padding, 10 pt between parts.
public struct Item<Tags: View, Trailing: View>: View {
    private let title: String
    private let symbol: String?
    private let tone: Tone?
    private let copy: String?
    private let copyCaption: String?
    private let comment: String?
    private let tags: Tags
    private let trailing: Trailing
    @Environment(\.umbra) private var theme

    public init(_ title: String, symbol: String? = nil, tone: Tone? = nil, copy: String? = nil,
                copyCaption: String? = nil, comment: String? = nil,
                @ViewBuilder tags: () -> Tags, @ViewBuilder trailing: () -> Trailing) {
        self.title = title
        self.symbol = symbol
        self.tone = tone
        self.copy = copy
        self.copyCaption = copyCaption
        self.comment = comment
        self.tags = tags()
        self.trailing = trailing()
    }

    public var body: some View {
        let p = theme.palette
        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 12) {
                if let symbol { RowIcon(symbol, tone: tone ?? .accent) }
                Text(title).font(.system(size: 13, weight: .semibold)).foregroundStyle(p.fg)
                    .frame(maxWidth: .infinity, alignment: .leading)
                trailing
            }
            if Tags.self != EmptyView.self {
                HStack(spacing: 6) { tags }
            }
            if let copy { CopyField(copy, caption: copyCaption) }
            if let comment {
                Text(comment).font(Font.xs).foregroundStyle(p.fg3).lineSpacing(2)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
        .padding(14)
    }
}
