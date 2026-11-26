import SwiftUI

/// Форма дії з двох і більше полів: аркуш фіксованої ширини, поля — `FormInput` (підпис, поле з рамкою, рядок
/// помилки з зарезервованим місцем), унизу праворуч «Скасувати» і OK. Помилки не зсувають розмітку.
struct UiFormSheet: View {
    let form: UiForm
    let onCancel: () -> Void
    let onSubmit: ([String: String]) -> Void
    @State private var values: [String: String] = [:]

    private var valid: Bool { form.fields.allSatisfy { $0.accepts(values[$0.name] ?? "", in: values) } }

    var body: some View {
        FormSheet(title: form.title, submit: form.submit ?? "Зберегти", canSubmit: valid, onCancel: onCancel, onSubmit: { onSubmit(values) }) {
            ForEach(form.fields) { field in
                UiFormFieldView(field: field, value: binding(field), error: field.mismatch(in: values, fields: form.fields)) {
                    if valid { onSubmit(values) }
                }
            }
        }
        .onAppear {
            values = Dictionary(uniqueKeysWithValues: form.fields.map { ($0.name, $0.value ?? $0.options?.first?.value ?? "") })
        }
    }

    private func binding(_ field: UiFormField) -> Binding<String> {
        Binding(get: { values[field.name] ?? "" }, set: { values[field.name] = $0 })
    }
}

extension UiFormField {
    /// Те саме, що перевіряє браузер: required, minLength і збіг з полем `sameAs`. Решту перевіряє сервер.
    func accepts(_ value: String, in values: [String: String] = [:]) -> Bool {
        if required == true && value.isEmpty { return false }
        if let minLength, !value.isEmpty, value.count < minLength { return false }
        if let sameAs, value != (values[sameAs] ?? "") { return false }
        return true
    }

    /// Текст помилки поля, коли воно вже заповнене: закоротке або не збігається з полем `sameAs`.
    func mismatch(in values: [String: String], fields: [UiFormField]) -> String? {
        let value = values[name] ?? ""
        guard !value.isEmpty else { return nil }
        if let minLength, value.count < minLength { return "Щонайменше \(minLength) символів" }
        if let sameAs, value != (values[sameAs] ?? "") {
            return "Не збігається з полем «\(fields.first { $0.name == sameAs }?.label ?? sameAs)»"
        }
        return nil
    }
}

/// Одне поле форми за його видом: текст, пароль і URL — `FormInput`, вибір — підпис і меню.
struct UiFormFieldView: View {
    let field: UiFormField
    @Binding var value: String
    var error: String?
    var onSubmit: () -> Void = {}

    var body: some View {
        if field.kind == "select" {
            VStack(alignment: .leading, spacing: 5) {
                Text(field.label).font(.callout).foregroundStyle(.secondary)
                Picker(field.label, selection: $value) {
                    ForEach(field.options ?? [], id: \.value) { Text($0.label).tag($0.value) }
                }
                .labelsHidden()
                Text(error ?? field.hint ?? " ").font(.caption)
                    .foregroundStyle(error != nil ? Color.red : Color.secondary)
            }
        } else {
            FormInput(label: field.label, text: $value, prompt: field.placeholder, secure: field.kind == "password",
                      hint: field.hint, error: error, onSubmit: onSubmit)
        }
    }
}
