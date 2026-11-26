import AppKit
import SwiftUI

/// Картка елемента: заголовок (назва; праворуч статус, керування, дії), теги, значення для копіювання, коментар.
/// Інлайн-форма з одним полем стає на місце коментаря. Під заголовком кнопок немає.
struct UiItemView: View {
    let item: UiItem
    @EnvironmentObject private var model: AwakeModel
    @State private var inline: UiMenuItem?
    @State private var draft = ""
    @State private var copied = false

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            header
            if let tags = item.tags, !tags.isEmpty {
                HStack(spacing: 4) {
                    ForEach(tags, id: \.label) { UiTagView(tag: $0) }
                }
            }
            if let copy = item.copy {
                copyRow(copy)
            }
            if let inline, let field = inline.form?.fields.first {
                inlineForm(inline, field: field)
            } else if let comment = item.comment {
                Text(comment).font(.callout).foregroundStyle(.secondary)
            }
        }
    }

    private var header: some View {
        HStack(spacing: 10) {
            if let icon = item.icon {
                SettingsIcon(symbol: icon.symbol, color: icon.tone.color)
            }
            Text(item.title).lineLimit(1)
            Spacer(minLength: 12)
            if let status = item.status {
                UiStatusBadgeView(status: status)
            }
            if let control = item.control {
                UiControlView(control: control)
            }
            // Поки відкрита інлайн-форма, кнопка, що її відкрила, ховається: дії форми — під нею.
            if inline == nil, item.actions != nil || item.copy != nil {
                UiActionSetView(items: item.actions ?? [], local: localActions) { picked in
                    draft = picked.form?.fields.first?.value ?? ""
                    inline = picked
                }
            }
        }
    }

    /// Значення під назвою; «Скопійовано» на мить після копіювання з меню.
    private func copyRow(_ copy: UiItem.Copy) -> some View {
        HStack(spacing: 6) {
            Text(copy.value)
                .font(.callout.monospaced())
                .foregroundStyle(.secondary)
                .textSelection(.enabled)
            if copied {
                Text("Скопійовано").font(.caption).foregroundStyle(.green)
            }
        }
    }

    /// «Копіювати» і, для посилання, «Відкрити» — пункти меню «⋯» картки.
    private var localActions: [UiLocalAction] {
        guard let copy = item.copy else { return [] }
        var actions = [UiLocalAction(id: "copy", label: copy.label ?? "Копіювати", symbol: "doc.on.doc") {
            NSPasteboard.general.clearContents()
            NSPasteboard.general.setString(copy.value, forType: .string)
            copied = true
            DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) { copied = false }
        }]
        if let url = URL(string: copy.value), ["http", "https"].contains(url.scheme ?? "") {
            actions.append(UiLocalAction(id: "open", label: "Відкрити", symbol: "arrow.up.right.square") {
                NSWorkspace.shared.open(url)
            })
        }
        return actions
    }

    /// Одне поле: спільна `InlineForm` з `FormInput`. Помилку сервера аппка не отримує у відповідь, тож форма
    /// закривається одразу.
    private func inlineForm(_ picked: UiMenuItem, field: UiFormField) -> some View {
        InlineForm(submit: picked.form?.submit ?? "Зберегти", canSubmit: field.accepts(draft),
                   onCancel: { inline = nil }, onSubmit: { submit(picked, field: field) }) {
            UiFormFieldView(field: field, value: $draft, error: field.mismatch(in: [field.name: draft], fields: [field])) {
                submit(picked, field: field)
            }
        }
    }

    private func submit(_ picked: UiMenuItem, field: UiFormField) {
        guard field.accepts(draft) else { return }
        model.sendUiEvent(.action(picked.action.with(fields: [field.name: draft])))
        inline = nil
    }
}

/// Мітка-чип без дії.
private struct UiTagView: View {
    let tag: UiTag

    var body: some View {
        let color = (tag.tone ?? .gray).color
        Text(tag.label)
            .font(.caption)
            .padding(.horizontal, 6)
            .padding(.vertical, 1)
            .foregroundStyle(color)
            .background(color.opacity(0.14), in: RoundedRectangle(cornerRadius: 4))
    }
}
