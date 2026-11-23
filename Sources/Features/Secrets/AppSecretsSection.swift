import SwiftUI

/// «Ключі аппки» на сторінці «Підключення»: токен воркспейсу webhooxy, ключ JWT і пароль дашборду, спільні для всіх вебхуків.
/// Значення ніколи не показуються: лише звідки агент їх узяв. Ключ з Envify чи process.env у файлі не потрібен.
struct AppSecretsSection: View {
    @EnvironmentObject private var model: AwakeModel
    @State private var values: [String: String] = [:]
    @State private var editing = false
    @State private var saveError: String?

    private typealias Key = AppSecretsStore.Key

    var body: some View {
        Section {
            row("Токен воркспейсу", key: Key.workspaceToken, prompt: "privateKey воркспейсу")
            row("Ключ JWT", key: Key.jwtKey, prompt: "ключ HS256")
            row("Пароль дашборду", key: Key.dashboardPassword, prompt: "щонайменше 12 символів")
            buttons
        } header: {
            Text("Ключі аппки")
        } footer: {
            Text("Токен воркспейсу підписує запити до webhooxy, ключ JWT — квитки viewer-ів relay (спільний з дашбордом). Пріоритет: process.env, Envify, secrets.env на цьому Mac. Пароль дашборду — вхід на вебі через Tailscale після розлогіну.")
        }
        .animation(.default, value: editing)
    }

    private func agentKey(_ name: String) -> AgentSecrets.Key? { model.secrets?.key(name) }

    @ViewBuilder
    private func row(_ title: String, key: String, prompt: String) -> some View {
        let agent = agentKey(key)
        if editing {
            SettingsRow(title: title, symbol: "lock.fill", color: .gray) {
                SecretField(text: binding(key), prompt: agent?.isOverridden == true
                    ? "з \(agent?.sourceLabel ?? "")"
                    : AppSecretsStore.isSet(key) ? "задано, лишити" : prompt)
                    .frame(maxWidth: 240)
                    .textFieldStyle(.roundedBorder)
            }
        } else {
            let isSet = agent.map { $0.source != nil } ?? AppSecretsStore.isSet(key)
            SettingsRow(title: title, symbol: "lock.fill", color: .gray) {
                HStack(spacing: 8) {
                    Text(isSet ? "задано" : "немає").foregroundStyle(.secondary)
                    if let source = agent?.sourceLabel { SourceTag(text: source) }
                }
            }
        }
    }

    private func binding(_ key: String) -> Binding<String> {
        Binding(get: { values[key] ?? "" }, set: { values[key] = $0 })
    }

    private var buttons: some View {
        HStack {
            if let saveError { Text(saveError).foregroundStyle(.red) }
            Spacer()
            if editing {
                Button("Скасувати") { cancel() }
                Button("Зберегти") { save() }
                    .buttonStyle(.borderedProminent)
                    .disabled(values.values.allSatisfy(\.isEmpty))
                    .keyboardShortcut(.defaultAction)
            } else {
                Button("Змінити") { editing = true }
            }
        }
    }

    private func save() {
        do {
            try model.saveAppSecrets(values)
            cancel()
        } catch {
            saveError = error.localizedDescription
        }
    }

    private func cancel() {
        values = [:]
        saveError = nil
        editing = false
    }
}
