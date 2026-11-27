import SwiftUI

/// Muted paragraph inside a card (`.u-text`): 11 pt, fg-3 or the tone, 12 / 14 pt padding.
public struct Note: View {
    private let text: String
    private let tone: Tone?
    @Environment(\.umbra) private var theme

    public init(_ text: String, tone: Tone? = nil) {
        self.text = text
        self.tone = tone
    }

    public var body: some View {
        Text(text)
            .font(UmbraFont.xs)
            .lineSpacing(2)
            .foregroundStyle(tone.map { $0.color(theme.palette) } ?? theme.palette.fg3)
            .frame(maxWidth: .infinity, alignment: .leading)
            .fixedSize(horizontal: false, vertical: true)
            .padding(.horizontal, 14)
            .padding(.vertical, 12)
    }
}
