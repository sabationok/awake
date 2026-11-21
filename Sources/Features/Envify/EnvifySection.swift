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
            SettingsRow(title: "Envify", symbol: "key.horizontal.fill", color: .purple,
                        text: model.secrets?.envify.url ?? "немає для цього stage")
            if editing {
                SettingsRow(title: "Токен сервісу", symbol: "lock.fill", color: .gray) {
                    SecretField(text: $token, prompt: hasToken ? "задано, лишити" : "envify_…")
                        .frame(maxWidth: 240)
                        .textFieldStyle(.roundedBorder)
                }
            } else {
                SettingsRow(title: "Токен сервісу", symbol: "lock.fill", color: .gray, text: hasToken ? "задано" : "немає")
                SettingsRow(title: "Стан", symbol: "arrow.down.circle", color: .gray) {
                    Text(stateText).foregroundStyle(model.secrets?.envify.state == "error" ? .red : .secondary)
                }
            }
            buttons
        } header: {
            Text("Секрети")
        } footer: {
            Text("Токен з вкладки Connect сервісу в Envify, лежить у envify.env на цьому Mac. Ключі з Envify перебивають файли на кшталт relay.env; process.env перебиває все.")
        }
        .animation(.default, value: editing)
        .onAppear {
            hasToken = EnvifySettingsStore.hasToken
            editing = !hasToken
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

    /// «Оновити» + «Змінити» в перегляді; «Скасувати» + «Зберегти» в редагуванні.
    private var buttons: some View {
        HStack {
            if let saveError { Text(saveError).foregroundStyle(.red) }
            Spacer()
            if editing {
                if hasToken {
                    Button("Скасувати") { cancel() }
                }
                Button("Зберегти") { save() }
                    .buttonStyle(.borderedProminent)
                    .disabled(token.isEmpty)
                    .keyboardShortcut(.defaultAction)
            } else {
                Button("Оновити") { model.refreshEnvify() }
                    .disabled(!hasToken || model.secrets?.envify.state == "loading")
                Button("Змінити") { editing = true }
            }
        }
    }

    private func save() {
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
