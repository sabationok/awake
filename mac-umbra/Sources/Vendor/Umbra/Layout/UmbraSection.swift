import SwiftUI

/// Section (`.u-section`): uppercase title with optional trailing actions, content, muted footer.
public struct UmbraSection<Content: View, Trailing: View>: View {
    private let title: String?
    private let footer: String?
    private let content: Content
    private let trailing: Trailing
    @Environment(\.umbra) private var theme

    public init(_ title: String? = nil, footer: String? = nil,
                @ViewBuilder content: () -> Content, @ViewBuilder trailing: () -> Trailing) {
        self.title = title
        self.footer = footer
        self.content = content()
        self.trailing = trailing()
    }

    public var body: some View {
        let p = theme.palette
        VStack(alignment: .leading, spacing: 8) {
            if title != nil || Trailing.self != EmptyView.self {
                HStack(spacing: 10) {
                    if let title {
                        Text(title.uppercased())
                            .font(UmbraFont.caps)
                            .tracking(0.9)
                            .foregroundStyle(p.fg2)
                            .lineLimit(1)
                    }
                    Spacer(minLength: 0)
                    trailing
                }
                .padding(.horizontal, 4)
                .frame(minHeight: 26)
            }
            content
            if let footer {
                Text(footer)
                    .font(UmbraFont.xs)
                    .foregroundStyle(p.fg3)
                    .lineSpacing(2)
                    .padding(.horizontal, 4)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
    }
}

public extension UmbraSection where Trailing == EmptyView {
    init(_ title: String? = nil, footer: String? = nil, @ViewBuilder content: () -> Content) {
        self.init(title, footer: footer, content: content) { EmptyView() }
    }
}

/// Panel (`.u-panel`): one surface with hairlines between its direct children.
public struct Panel<Content: View>: View {
    private let content: Content
    @Environment(\.umbra) private var theme

    public init(@ViewBuilder content: () -> Content) {
        self.content = content()
    }

    public var body: some View {
        Divided { content }
            .frame(maxWidth: .infinity, alignment: .leading)
            .umbraSurface(.panel)
            .clipShape(RoundedRectangle(cornerRadius: Radius.md, style: .continuous))
    }
}

/// A plain stack with a hairline between its direct children, for a block inside a panel that has its own parts
/// (a tab bar over the active tab's rows, a list).
public struct Divided<Content: View>: View {
    private let content: Content
    @Environment(\.umbra) private var theme

    public init(@ViewBuilder content: () -> Content) {
        self.content = content()
    }

    public var body: some View {
        _VariadicView.Tree(DividedLayout(line: theme.palette.line)) { content }
    }
}

/// Puts a hairline between each pair of children (`.u-panel > * + * { border-top }`).
struct DividedLayout: _VariadicView_MultiViewRoot {
    let line: Color

    @ViewBuilder
    func body(children: _VariadicView.Children) -> some View {
        let lastID = children.last?.id
        VStack(spacing: 0) {
            ForEach(children) { child in
                child
                if child.id != lastID {
                    Rectangle().fill(line).frame(height: 1)
                }
            }
        }
    }
}
