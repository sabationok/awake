import SwiftUI

/// «Ключі аппки» на сторінці «Підключення»: лише токен воркспейсу webhooxy. Ключ JWT і пароль Web UI — серверні
/// рядки на «Web UI → Вхід». Значення ніколи не показуються: лише звідки агент їх узяв.
/// TODO(webhooxy): токен переїде рядком на головну вкладку Webhooxy, як ключ JWT на «Вхід».
struct AppSecretsSection: View {
    @EnvironmentObject private var model: AwakeModel
    @State private var value = ""
    @State private var editing = false
    @State private var saveError: String?

    private let key = AppSecretsStore.Key.workspaceToken

    var body: some View {
        Section {
            ItemCard(title: "Токен воркспейсу", symbol: "lock.fill", color: .gray, status: status) {
                if !editing { ItemCardActions(actions: [.init(id: "edit", label: isSet ? "Змінити" : "Задати", prominent: !isSet) { editing = true }]) }
            } below: {
                if let source = agentKey?.sourceLabel { SourceTag(text: source) }
                if editing {
                    InlineForm(canSubmit: !value.isEmpty, onCancel: cancel, onSubmit: save) {
                        FormInput(label: isSet ? "Новий токен" : "Токен воркспейсу", text: $value, prompt: "privateKey воркспейсу",
                                  secure: true, hint: "Підписує запити до webhooxy.", error: saveError, onSubmit: save)
                    }
                }
            }
        } header: {
            Text("Ключі аппки")
        } footer: {
            Text("Пріоритет: process.env, Envify, secrets.env на цьому Mac. Ключ JWT і пароль Web UI — на «Web UI → Вхід».")
        }
        .animation(.default, value: editing)
    }

    private var agentKey: AgentSecrets.Key? { model.secrets?.key(key) }
    private var isSet: Bool { agentKey.map { $0.source != nil } ?? AppSecretsStore.isSet(key) }

    private var status: ItemCardStatus {
        isSet ? ItemCardStatus(label: "Задано", color: .green) : ItemCardStatus(label: "Немає", color: .gray)
    }

    private func save() {
        guard !value.isEmpty else { return }
        do {
            try model.saveAppSecrets([key: value])
            cancel()
        } catch {
            saveError = error.localizedDescription
        }
    }

    private func cancel() {
        value = ""
        saveError = nil
        editing = false
    }
}
