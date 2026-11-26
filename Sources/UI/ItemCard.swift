import SwiftUI

/// Стан словом з крапкою праворуч у заголовку картки: «● Працює».
struct ItemCardStatus {
    var label: String
    var color: Color
    var pulse = false
}

/// Картка елемента, як `item` з дерева сервера: іконка і назва; праворуч стан словом і дії; під назвою коментар
/// і вміст `below` (значення, інлайн-форма). Кнопок під заголовком немає: дії лише праворуч.
struct ItemCard<Trailing: View, Below: View>: View {
    let title: String
    var symbol: String?
    var color: Color = .gray
    var status: ItemCardStatus?
    var comment: String?
    var commentColor: Color = .secondary
    @ViewBuilder var trailing: () -> Trailing
    @ViewBuilder var below: () -> Below

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack(spacing: 10) {
                if let symbol {
                    SettingsIcon(symbol: symbol, color: color)
                }
                Text(title).lineLimit(1)
                Spacer(minLength: 12)
                if let status {
                    HStack(spacing: 5) {
                        StatusDot(color: status.color, pulse: status.pulse)
                        Text(status.label)
                    }
                    .font(.callout)
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
                    .fixedSize()
                }
                trailing()
            }
            if let comment {
                Text(comment).font(.callout).foregroundStyle(commentColor)
            }
            below()
        }
    }
}

extension ItemCard where Below == EmptyView {
    init(title: String, symbol: String? = nil, color: Color = .gray, status: ItemCardStatus? = nil, comment: String? = nil,
         commentColor: Color = .secondary, @ViewBuilder trailing: @escaping () -> Trailing) {
        self.init(title: title, symbol: symbol, color: color, status: status, comment: comment, commentColor: commentColor,
                  trailing: trailing, below: { EmptyView() })
    }
}

extension ItemCard where Trailing == EmptyView, Below == EmptyView {
    init(title: String, symbol: String? = nil, color: Color = .gray, status: ItemCardStatus? = nil, comment: String? = nil,
         commentColor: Color = .secondary) {
        self.init(title: title, symbol: symbol, color: color, status: status, comment: comment, commentColor: commentColor,
                  trailing: { EmptyView() }, below: { EmptyView() })
    }
}

/// Дії картки: одна — кнопка, кілька — меню «⋯».
struct ItemCardActions: View {
    struct Action: Identifiable {
        let id: String
        let label: String
        var symbol: String?
        var role: ButtonRole?
        var prominent = false
        var disabled = false
        let run: () -> Void
    }

    let actions: [Action]

    var body: some View {
        if actions.count == 1, let action = actions.first {
            let button = Button(action.label, role: action.role, action: action.run)
                .controlSize(.small)
                .disabled(action.disabled)
            if action.prominent {
                button.buttonStyle(.borderedProminent)
            } else {
                button.buttonStyle(.bordered)
            }
        } else if actions.count > 1 {
            Menu {
                ForEach(actions) { action in
                    Button(role: action.role, action: action.run) {
                        if let symbol = action.symbol {
                            Label(action.label, systemImage: symbol)
                        } else {
                            Text(action.label)
                        }
                    }
                    .disabled(action.disabled)
                }
            } label: {
                Image(systemName: "ellipsis")
            }
            .menuStyle(.borderlessButton)
            .menuIndicator(.hidden)
            .fixedSize()
            .accessibilityLabel("Дії")
        }
    }
}
