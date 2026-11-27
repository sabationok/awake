import SwiftUI

/// Notice (`.u-notice`): toned block with an icon, a bold title and text.
public struct Notice<Actions: View>: View {
    private let tone: Tone
    private let symbol: String
    private let title: String
    private let text: String?
    private let actions: Actions
    @Environment(\.umbra) private var theme

    public init(tone: Tone, symbol: String = "info.circle", title: String, text: String? = nil,
                @ViewBuilder actions: () -> Actions) {
        self.tone = tone
        self.symbol = symbol
        self.title = title
        self.text = text
        self.actions = actions()
    }

    public var body: some View {
        let p = theme.palette
        let color = tone.color(p)
        let shape = RoundedRectangle(cornerRadius: Radius.md, style: .continuous)
        HStack(alignment: .top, spacing: 12) {
            Image(systemName: symbol).font(.system(size: 14, weight: .medium)).foregroundStyle(color)
                .frame(width: 18, height: 18)
            VStack(alignment: .leading, spacing: 2) {
                Text(title).font(.system(size: 12, weight: .semibold))
                if let text { Text(text).font(.system(size: 12)).foregroundStyle(p.fg2) }
            }
            .lineSpacing(2)
            .frame(maxWidth: .infinity, alignment: .leading)
            actions
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 12)
        .background(p.surface1, in: shape)
        .background(color.opacity(0.09), in: shape)
        .overlay(shape.strokeBorder(color.opacity(0.3)))
    }
}

public extension Notice where Actions == EmptyView {
    init(tone: Tone, symbol: String = "info.circle", title: String, text: String? = nil) {
        self.init(tone: tone, symbol: symbol, title: title, text: text) { EmptyView() }
    }
}

/// Empty state (`.u-empty`): centred muted icon and text.
public struct EmptyState: View {
    private let text: String
    private let symbol: String
    @Environment(\.umbra) private var theme

    public init(_ text: String, symbol: String = "info.circle") {
        self.text = text
        self.symbol = symbol
    }

    public var body: some View {
        VStack(spacing: 10) {
            Image(systemName: symbol).font(.system(size: 26, weight: .light)).frame(width: 34, height: 34)
            Text(text).font(.system(size: 12)).multilineTextAlignment(.center)
        }
        .foregroundStyle(theme.palette.fg3)
        .frame(maxWidth: .infinity)
        .padding(.vertical, 28)
        .padding(.horizontal, 16)
    }
}
