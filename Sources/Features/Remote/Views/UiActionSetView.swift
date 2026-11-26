import SwiftUI

/// Дії елемента з сервера: 1 пункт — кнопка, 2+ — меню «⋯», 0 — нічого.
/// Підтвердження — confirmationDialog; форма з одним полем — інлайн у батька (`onInlineForm`), більше — аркуш.
struct UiActionSetView: View {
    let items: [UiMenuItem]
    /// Дії самої аппки без сервера (копіювати, відкрити посилання): стоять у тому самому меню перед серверними.
    var local: [UiLocalAction] = []
    var onInlineForm: ((UiMenuItem) -> Void)?
    @EnvironmentObject private var model: AwakeModel
    @State private var confirming: UiMenuItem?
    @State private var editing: UiMenuItem?

    var body: some View {
        content
            .confirmationDialog(
                confirming?.confirm?.title ?? "",
                isPresented: Binding(get: { confirming != nil }, set: { if !$0 { confirming = nil } }),
                titleVisibility: .visible,
                presenting: confirming
            ) { item in
                Button(item.confirm?.ok ?? item.label, role: item.variant == .danger ? .destructive : nil) {
                    send(item.action)
                }
                Button("Скасувати", role: .cancel) {}
            } message: { item in
                Text(item.confirm?.text ?? "")
            }
            .sheet(item: $editing) { item in
                UiFormSheet(form: item.form ?? UiForm(fields: []), onCancel: { editing = nil }) { values in
                    send(item.action.with(fields: values))
                    editing = nil
                }
            }
    }

    @ViewBuilder
    private var content: some View {
        if items.isEmpty, local.count == 1, let only = local.first {
            Button(only.label, action: only.run).buttonStyle(.bordered).controlSize(.small)
        } else if items.count == 1, local.isEmpty, let item = items.first {
            styled(Button(item.label) { pick(item) }, variant: item.variant)
                .controlSize(.small)
                .disabled(item.disabled == true)
                .help(item.hint ?? "")
        } else if items.count + local.count > 1 {
            Menu {
                ForEach(local) { action in
                    Button(action: action.run) { Label(action.label, systemImage: action.symbol) }
                }
                ForEach(items) { item in
                    Button(role: item.variant == .danger ? .destructive : nil) { pick(item) } label: {
                        if let icon = item.icon {
                            Label(item.label, systemImage: icon.symbol)
                        } else {
                            Text(item.label)
                        }
                    }
                    .disabled(item.disabled == true)
                    .help(item.hint ?? "")
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

    /// Колір кнопки за варіантом; danger ще й з роллю destructive.
    @ViewBuilder
    private func styled(_ button: Button<Text>, variant: UiActionVariant) -> some View {
        switch variant {
        case .default: button.buttonStyle(.bordered)
        case .accent: button.buttonStyle(.bordered).tint(.accentColor)
        case .warn: button.buttonStyle(.bordered).tint(.orange)
        case .danger: button.buttonStyle(.bordered).tint(.red)
        }
    }

    private func pick(_ item: UiMenuItem) {
        if let form = item.form {
            if form.fields.count == 1, let onInlineForm {
                onInlineForm(item)
            } else {
                editing = item
            }
        } else if item.confirm != nil {
            confirming = item
        } else {
            send(item.action)
        }
    }

    private func send(_ action: UiAction) {
        model.sendUiEvent(.action(action))
    }
}

/// Дія самої аппки в меню «⋯»: без сервера, напр. скопіювати адресу.
struct UiLocalAction: Identifiable {
    let id: String
    let label: String
    let symbol: String
    let run: () -> Void
}
