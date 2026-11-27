import SwiftUI

/// The small muted line at the bottom of the sidebar (app name and variant, version).
public struct UmbraSidebarFooter: View {
    private let text: String
    @Environment(\.umbra) private var theme

    public init(_ text: String) { self.text = text }

    public var body: some View {
        Text(text)
            .font(.system(size: 10))
            .foregroundStyle(theme.palette.fg3)
            .lineLimit(1)
            .padding(14)
    }
}

/// Where the data comes from (`.s-demo`): an accent-tinted plaque at the bottom of the sidebar, icon and two lines.
public struct UmbraSidebarSource: View {
    private let symbol: String
    private let title: String
    private let detail: String?
    private let tone: UmbraTone
    @Environment(\.umbra) private var theme

    public init(_ title: String, detail: String? = nil, symbol: String = "flask", tone: UmbraTone = .accent) {
        self.title = title
        self.detail = detail
        self.symbol = symbol
        self.tone = tone
    }

    public var body: some View {
        let color = tone.color(theme.palette)
        HStack(spacing: 8) {
            Image(systemName: symbol).font(.system(size: 12)).frame(width: 14, height: 14)
            VStack(alignment: .leading, spacing: 1) {
                Text(title)
                if let detail { Text(detail) }
            }
            .font(.system(size: 12))
            .lineLimit(2)
            Spacer(minLength: 0)
        }
        .foregroundStyle(color)
        .padding(.vertical, 9)
        .padding(.horizontal, 10)
        .background(color.opacity(0.10), in: RoundedRectangle(cornerRadius: 9, style: .continuous))
        .padding(.horizontal, 10)
        .padding(.bottom, 12)
    }
}
