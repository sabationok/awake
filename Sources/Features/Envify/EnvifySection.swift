import SwiftUI

/// «Envify» на сторінці «Підключення»: токен сервісу, з яким агент тягне ключі (relay тощо), і стан останнього завантаження.
struct EnvifySection: View {
    @EnvironmentObject private var model: AwakeModel
    @State private var hasToken = false
    @State private var token = ""
    @State private var editing = false
    @State private var saveError: String?

    var body: some View {
        Section {
            ItemCard(title: "Envify", symbol: "key.horizontal.fill", color: .purple,
                     comment: model.secrets?.envify.url ?? "немає для цього stage")
            ItemCard(title: "Токен сервісу", symbol: "lock.fill", color: .gray,
                     status: hasToken ? ItemCardStatus(label: "Задано", color: .green) : ItemCardStatus(label: "Немає", color: .gray),
                     comment: editing ? nil : stateText,
                     commentColor: model.secrets?.envify.state == "error" ? .red : .secondary) {
                if !editing { ItemCardActions(actions: actions) }
            } below: {
                if editing { inlineForm }
            }
        } header: {
            Text("Секрети")
        } footer: {
            Text("Токен з вкладки Connect сервісу в Envify, лежить у envify.env на цьому Mac. Ключі з Envify перебивають файли на кшталт relay.env; process.env перебиває все.")
        }
        .animation(.default, value: editing)
        .onAppear { hasToken = EnvifySettingsStore.hasToken }
    }

    /// З токеном: «Оновити» і «Змінити» в меню «⋯»; без нього — одна кнопка «Задати».
    private var actions: [ItemCardActions.Action] {
        guard hasToken else { return [.init(id: "set", label: "Задати", prominent: true) { editing = true }] }
        return [
            .init(id: "refresh", label: "Оновити", symbol: "arrow.clockwise",
                  disabled: model.secrets?.envify.state == "loading") { model.refreshEnvify() },
            .init(id: "edit", label: "Змінити", symbol: "pencil") { editing = true },
        ]
    }

    /// Одне поле — спільна інлайн-форма під лінією, кнопки праворуч.
    private var inlineForm: some View {
        InlineForm(canSubmit: !token.isEmpty, onCancel: cancel, onSubmit: save) {
            FormInput(label: hasToken ? "Новий токен" : "Токен сервісу", text: $token, prompt: "envify_…", secure: true,
                      hint: "З вкладки Connect сервісу в Envify.", error: saveError, onSubmit: save)
        }
    }

    private var stateText: String {
        guard let envify = model.secrets?.envify else { return "агент не запущений" }
        switch envify.state {
        case "ok":
            let time = envify.loadedAt.map { $0.formatted(date: .omitted, time: .shortened) } ?? ""
            return "змінних: \(envify.count)" + (time.isEmpty ? "" : " · \(time)")
        case "loading": return "завантаження…"
        case "error": return envify.error ?? "помилка"
        default: return hasToken ? "не завантажено" : "не підключено"
        }
    }

    private func save() {
        guard !token.isEmpty else { return }
        do {
            try model.saveEnvifyToken(token)
            hasToken = EnvifySettingsStore.hasToken
            token = ""
            saveError = nil
            editing = false
        } catch {
            saveError = error.localizedDescription
        }
    }

    private func cancel() {
        token = ""
        saveError = nil
        editing = false
    }
}
