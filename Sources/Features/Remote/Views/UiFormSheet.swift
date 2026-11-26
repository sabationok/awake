import SwiftUI

/// Форма дії з двох і більше полів: аркуш з «Скасувати» ліворуч і OK праворуч.
struct UiFormSheet: View {
    let form: UiForm
    let onCancel: () -> Void
    let onSubmit: ([String: String]) -> Void
    @State private var values: [String: String] = [:]

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            if let title = form.title {
                Text(title).font(.headline).padding([.top, .horizontal], 20)
            }
            Form {
                ForEach(form.fields) { field in
                    UiFormFieldView(field: field, value: binding(field))
                }
            }
            .formStyle(.grouped)
            HStack {
                Spacer()
                Button("Скасувати", action: onCancel).keyboardShortcut(.cancelAction)
                Button(form.submit ?? "Зберегти") { onSubmit(values) }
                    .keyboardShortcut(.defaultAction)
                    .disabled(!form.fields.allSatisfy { $0.accepts(values[$0.name] ?? "") })
            }
            .padding(20)
        }
        .frame(minWidth: 380)
        .onAppear {
            values = Dictionary(uniqueKeysWithValues: form.fields.map { ($0.name, $0.value ?? $0.options?.first?.value ?? "") })
        }
    }

    private func binding(_ field: UiFormField) -> Binding<String> {
        Binding(get: { values[field.name] ?? "" }, set: { values[field.name] = $0 })
    }
}

extension UiFormField {
    /// Те саме, що перевіряє браузер: required і minLength. Решту перевіряє сервер.
    func accepts(_ value: String) -> Bool {
        if required == true && value.isEmpty { return false }
        if let minLength, !value.isEmpty, value.count < minLength { return false }
        return true
    }
}

/// Одне поле форми за його видом.
struct UiFormFieldView: View {
    let field: UiFormField
    @Binding var value: String
    var labelHidden = false

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            input
            if let hint = field.hint {
                Text(hint).font(.caption).foregroundStyle(.secondary)
            }
        }
    }

    @ViewBuilder
    private var input: some View {
        switch field.kind {
        case "password":
            SecureField(field.label, text: $value, prompt: field.placeholder.map(Text.init))
                .labelsHidden(labelHidden)
        case "select":
            Picker(field.label, selection: $value) {
                ForEach(field.options ?? [], id: \.value) { Text($0.label).tag($0.value) }
            }
            .labelsHidden(labelHidden)
        default:
            TextField(field.label, text: $value, prompt: field.placeholder.map(Text.init))
                .labelsHidden(labelHidden)
        }
    }
}

private extension View {
    @ViewBuilder
    func labelsHidden(_ hidden: Bool) -> some View {
        if hidden { labelsHidden() } else { self }
    }
}
