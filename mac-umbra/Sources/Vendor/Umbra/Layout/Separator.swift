import SwiftUI

/// Separator (`.u-sep`): a hairline, or two hairlines with a muted word between them.
public struct Separator: View {
    private let word: String?
    @Environment(\.umbra) private var theme

    public init(_ word: String? = nil) { self.word = word }

    public var body: some View {
        let p = theme.palette
        HStack(spacing: 12) {
            Rectangle().fill(p.line).frame(height: 1)
            if let word {
                Text(word).font(UmbraFont.xs).foregroundStyle(p.fg3)
                Rectangle().fill(p.line).frame(height: 1)
            }
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 10)
    }
}
