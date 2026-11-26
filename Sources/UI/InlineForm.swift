import SwiftUI

/// Інлайн-форма картки (одне поле): під лінією вміст — зазвичай `FormInput`, нижче праворуч «Скасувати» і OK.
/// Кнопку, що відкрила форму, картка на цей час ховає. Одна розмітка для серверних і нативних карток.
struct InlineForm<Fields: View>: View {
    var submit = "Зберегти"
    var canSubmit = true
    let onCancel: () -> Void
    let onSubmit: () -> Void
    @ViewBuilder let fields: () -> Fields

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Divider().padding(.vertical, 4)
            fields()
            HStack(spacing: 8) {
                Spacer()
                Button("Скасувати", action: onCancel)
                    .keyboardShortcut(.cancelAction)
                Button(submit, action: onSubmit)
                    .buttonStyle(.borderedProminent)
                    .disabled(!canSubmit)
                    .keyboardShortcut(.defaultAction)
            }
        }
        .padding(.top, 2)
    }
}

/// Аркуш форми з кількох полів: фіксована ширина, заголовок, поля (`FormInput`), унизу праворуч «Скасувати» і OK.
/// Одна розмітка для серверних і нативних форм.
struct FormSheet<Fields: View>: View {
    let title: String?
    var submit = "Зберегти"
    var canSubmit = true
    let onCancel: () -> Void
    let onSubmit: () -> Void
    @ViewBuilder let fields: () -> Fields

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            if let title {
                Text(title).font(.headline)
            }
            VStack(alignment: .leading, spacing: 10) {
                fields()
            }
            HStack(spacing: 8) {
                Spacer()
                Button("Скасувати", action: onCancel).keyboardShortcut(.cancelAction)
                Button(submit, action: onSubmit)
                    .buttonStyle(.borderedProminent)
                    .keyboardShortcut(.defaultAction)
                    .disabled(!canSubmit)
            }
            .controlSize(.large)
        }
        .padding(22)
        .frame(width: 440)
    }
}
