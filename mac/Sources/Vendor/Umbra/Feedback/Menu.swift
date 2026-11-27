import SwiftUI

/// Entry of the «⋯» menu (`.u-menu`). `variant` colours the text (danger / warn / accent).
public struct MenuEntry: Identifiable {
    public var id: String
    public var title: String
    public var symbol: String?
    public var variant: ButtonVariant?
    public var hint: String?
    public var disabled: Bool
    public var action: () -> Void

    public init(id: String, title: String, symbol: String? = nil, variant: ButtonVariant? = nil,
                hint: String? = nil, disabled: Bool = false, action: @escaping () -> Void) {
        self.id = id
        self.title = title
        self.symbol = symbol
        self.variant = variant
        self.hint = hint
        self.disabled = disabled
        self.action = action
    }
}

/// «⋯» button that opens the themed menu in a popover.
public struct MenuButton: View {
    private let entries: [MenuEntry]
    private let label: String
    private let symbol: String
    @State private var open = false
    @Environment(\.umbra) private var theme

    public init(_ entries: [MenuEntry], label: String = "Дії", symbol: String = "ellipsis") {
        self.entries = entries
        self.label = label
        self.symbol = symbol
    }

    public var body: some View {
        IconButton(symbol, label: label) { open.toggle() }
            .popover(isPresented: $open, arrowEdge: .bottom) {
                Menu(entries) { open = false }
                    .umbraThemed(theme)
            }
    }
}

/// The menu list itself, for use in your own popover or overlay.
public struct Menu: View {
    private let entries: [MenuEntry]
    private let dismiss: () -> Void

    public init(_ entries: [MenuEntry], dismiss: @escaping () -> Void = {}) {
        self.entries = entries
        self.dismiss = dismiss
    }

    public var body: some View {
        MenuList {
            ForEach(entries) { entry in
                MenuItemView(title: entry.title, symbol: entry.symbol, variant: entry.variant,
                                  hint: entry.hint, disabled: entry.disabled) {
                    dismiss()
                    entry.action()
                }
            }
        }
    }
}

struct MenuList<Content: View>: View {
    @ViewBuilder let content: () -> Content

    var body: some View {
        VStack(alignment: .leading, spacing: 0) { content() }
            .padding(4)
            .frame(minWidth: 200, alignment: .leading)
    }
}

struct MenuItemView: View {
    let title: String
    let symbol: String?
    let variant: ButtonVariant?
    let hint: String?
    let disabled: Bool
    let action: () -> Void
    @State private var hovering = false
    @Environment(\.umbra) private var theme

    var body: some View {
        let p = theme.palette
        let color: Color = switch variant {
        case .danger: p.danger
        case .warn: p.orange
        case .accent: p.accent
        default: p.fg
        }
        Button(action: action) {
            HStack(spacing: 10) {
                ZStack {
                    if let symbol {
                        Image(systemName: symbol)
                            .font(.system(size: 12))
                            .foregroundStyle(variant == nil ? p.fg2 : color)
                    }
                }
                .frame(width: 16, height: 16)
                Text(title).font(.system(size: 12)).foregroundStyle(color).lineLimit(1)
                Spacer(minLength: 12)
                if let hint {
                    Text(hint).font(.system(size: 11).monospacedDigit()).foregroundStyle(p.fg3)
                }
            }
            .frame(height: 32)
            .padding(.horizontal, 10)
            .background(hovering && !disabled ? p.surface3 : .clear,
                        in: RoundedRectangle(cornerRadius: Radius.sm, style: .continuous))
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .disabled(disabled)
        .opacity(disabled ? 0.45 : 1)
        .onHover { hovering = $0 }
    }
}
