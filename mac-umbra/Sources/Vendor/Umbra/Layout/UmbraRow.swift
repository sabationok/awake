import SwiftUI

/// Toned square with an SF Symbol (`.u-row-icon`).
public struct UmbraRowIcon: View {
    private let symbol: String
    private let tone: UmbraTone?
    private let size: CGFloat
    @Environment(\.umbra) private var theme

    public init(_ symbol: String, tone: UmbraTone? = nil, size: CGFloat = 26) {
        self.symbol = symbol
        self.tone = tone
        self.size = size
    }

    public var body: some View {
        let p = theme.palette
        let color = tone?.color(p) ?? p.fg2
        let base = tone?.color(p) ?? p.fg3
        ZStack {
            RoundedRectangle(cornerRadius: size * 0.27, style: .continuous).fill(base.opacity(0.14))
            Image(systemName: symbol)
                .font(.system(size: (size * 0.52).rounded(), weight: .medium))
                .foregroundStyle(color)
        }
        .frame(width: size, height: size)
        .accessibilityHidden(true)
    }
}

/// Row (`.u-row`): icon, label with hint, value and/or a trailing control. `prominent` is the large first row
/// of a module page.
public struct UmbraRow<Control: View>: View {
    private let label: String
    private let hint: String?
    private let value: String?
    private let symbol: String?
    private let tone: UmbraTone?
    private let prominent: Bool
    private let control: Control
    @Environment(\.umbra) private var theme

    public init(_ label: String, hint: String? = nil, value: String? = nil, symbol: String? = nil,
                tone: UmbraTone? = nil, prominent: Bool = false, @ViewBuilder control: () -> Control) {
        self.label = label
        self.hint = hint
        self.value = value
        self.symbol = symbol
        self.tone = tone
        self.prominent = prominent
        self.control = control()
    }

    public var body: some View {
        let p = theme.palette
        HStack(spacing: 12) {
            if let symbol {
                UmbraRowIcon(symbol, tone: tone, size: prominent ? 38 : 26)
            }
            VStack(alignment: .leading, spacing: 3) {
                Text(label)
                    .font(.system(size: prominent ? 15 : 12, weight: prominent ? .semibold : .medium))
                    .foregroundStyle(p.fg)
                if let hint {
                    Text(hint).font(UmbraFont.xs).foregroundStyle(p.fg3).lineSpacing(2)
                }
            }
            .fixedSize(horizontal: false, vertical: true)
            .frame(maxWidth: .infinity, alignment: .leading)
            if let value {
                Text(value)
                    .font(.system(size: 12).monospacedDigit())
                    .foregroundStyle(p.fg2)
                    .multilineTextAlignment(.trailing)
            }
            control
        }
        .padding(.horizontal, 14)
        .padding(.vertical, prominent ? 14 : 8)
        .frame(minHeight: UmbraLayout.rowMinHeight)
    }
}

public extension UmbraRow where Control == EmptyView {
    init(_ label: String, hint: String? = nil, value: String? = nil, symbol: String? = nil,
         tone: UmbraTone? = nil, prominent: Bool = false) {
        self.init(label, hint: hint, value: value, symbol: symbol, tone: tone, prominent: prominent) { EmptyView() }
    }
}

/// Row with a switch on the right: the most common settings row.
public struct UmbraSwitchRow: View {
    private let label: String
    private let hint: String?
    private let symbol: String?
    private let tone: UmbraTone?
    @Binding private var isOn: Bool

    public init(_ label: String, hint: String? = nil, symbol: String? = nil, tone: UmbraTone? = nil,
                isOn: Binding<Bool>) {
        self.label = label
        self.hint = hint
        self.symbol = symbol
        self.tone = tone
        _isOn = isOn
    }

    public var body: some View {
        UmbraRow(label, hint: hint, symbol: symbol, tone: tone) {
            Toggle(label, isOn: $isOn).toggleStyle(.umbra).labelsHidden()
        }
    }
}

/// List row (`.u-list-row`): optional dot, title, subtitle, trailing text; highlights on hover.
public struct UmbraListRow<Trailing: View>: View {
    private let title: String
    private let subtitle: String?
    private let dot: UmbraTone?
    private let trailing: Trailing
    @State private var hovering = false
    @Environment(\.umbra) private var theme

    public init(_ title: String, subtitle: String? = nil, dot: UmbraTone? = nil,
                @ViewBuilder trailing: () -> Trailing) {
        self.title = title
        self.subtitle = subtitle
        self.dot = dot
        self.trailing = trailing()
    }

    public var body: some View {
        let p = theme.palette
        HStack(spacing: 12) {
            if let dot { UmbraDot(dot) }
            VStack(alignment: .leading, spacing: 2) {
                Text(title).font(.system(size: 12, weight: .medium))
                if let subtitle { Text(subtitle).font(UmbraFont.xs).foregroundStyle(p.fg3) }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            trailing
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 10)
        .background(hovering ? p.surface2.opacity(0.6) : .clear)
        .onHover { hovering = $0 }
    }
}

public extension UmbraListRow where Trailing == Text {
    init(_ title: String, subtitle: String? = nil, dot: UmbraTone? = nil, trailing: String) {
        self.init(title, subtitle: subtitle, dot: dot) {
            Text(trailing).font(.system(size: 11).monospacedDigit()).foregroundStyle(.secondary)
        }
    }
}
