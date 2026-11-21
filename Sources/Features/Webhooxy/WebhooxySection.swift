import SwiftUI

/// «Ключі» webhooxy на головній вкладці Webhooxy: relay.env редагує лише аппка, секрети в дерево агента не йдуть.
/// Біля кожного ключа — звідки агент його взяв (relay.env, Envify, process.env): це шле агент у `secrets`.
struct WebhooxySection: View {
    @EnvironmentObject private var model: AwakeModel
    @State private var saved = RelaySettings()
    @State private var draft = RelaySettings()
    @State private var secrets = RelaySecrets()
    @State private var editing = false
    @State private var saveError: String?

    var body: some View {
        Section {
            field("Workspace", key: Key.workspace, symbol: "building.2", text: $draft.workspace, value: saved.workspace, prompt: "slug воркспейсу")
            field("Destination", key: Key.destId, symbol: "arrow.triangle.branch", text: $draft.destId, value: saved.destId, prompt: "id DEST-а")
            field("Room", key: Key.room, symbol: "door.left.hand.open", text: $draft.room, value: saved.room, prompt: "room DEST-а")
            secret("Токен воркспейсу", key: Key.workspaceToken, text: $secrets.workspaceToken, isSet: saved.hasWorkspaceToken)
            secret("Ключ квитків", key: Key.ticketKey, text: $secrets.ticketKey, isSet: saved.hasTicketKey)
            buttons
        } header: {
            Text("Ключі")
        } footer: {
            Text("Справа — звідки ключ: relay.env на цьому Mac, Envify чи process.env. Ключ з Envify перебиває relay.env, тож у файлі його можна не задавати. Після збереження агент перепідключається.")
        }
        .animation(.default, value: editing)
        .onAppear {
            saved = RelaySettingsStore.load()
            draft = saved
            editing = !isConfigured
        }
    }

    private typealias Key = RelaySettingsStore.Key

    /// Ключ, як його бачить агент; nil, поки агент не надіслав `secrets`.
    private func agentKey(_ name: String) -> AgentSecrets.Key? { model.secrets?.relayKey(name) }

    /// Ключ є в Envify чи process.env: файл можна лишити порожнім.
    private func isOverridden(_ name: String) -> Bool { agentKey(name)?.isOverridden ?? false }

    /// Усі ключі є хоч звідкись. Без агента — лише за relay.env.
    private var isConfigured: Bool {
        guard let secrets = model.secrets else { return saved.isConfigured }
        return secrets.relay.allSatisfy { $0.source != nil }
    }

    /// «Змінити» в перегляді; «Скасувати» + «Зберегти» в редагуванні.
    private var buttons: some View {
        HStack {
            if let saveError { Text(saveError).foregroundStyle(.red) }
            Spacer()
            if editing {
                if isConfigured {
                    Button("Скасувати") { cancel() }
                }
                Button("Зберегти") { save() }
                    .buttonStyle(.borderedProminent)
                    .disabled(!isDirty || !canSave)
                    .keyboardShortcut(.defaultAction)
            } else {
                Button("Змінити") { editing = true }
            }
        }
    }

    /// У перегляді — значення, яким користується агент, і його джерело; у редагуванні — поле relay.env.
    @ViewBuilder
    private func field(_ title: String, key: String, symbol: String, text: Binding<String>, value: String, prompt: String) -> some View {
        let agent = agentKey(key)
        if editing {
            SettingsRow(title: title, symbol: symbol, color: .gray) {
                TextField("", text: text, prompt: Text(isOverridden(key) ? "з \(agent?.sourceLabel ?? "")" : prompt))
                    .frame(maxWidth: 240)
                    .textFieldStyle(.roundedBorder)
                    .multilineTextAlignment(.trailing)
            }
        } else {
            let shown = agent.map { $0.value ?? "" } ?? value
            sourced(title, symbol: symbol, text: shown.isEmpty ? "немає" : shown, source: agent?.sourceLabel ?? (value.isEmpty ? nil : "relay.env"))
        }
    }

    private func sourced(_ title: String, symbol: String, text: String, source: String?) -> some View {
        SettingsRow(title: title, symbol: symbol, color: .gray) {
            HStack(spacing: 8) {
                Text(text).foregroundStyle(.secondary)
                if let source { SourceTag(text: source) }
            }
        }
    }

    /// Секрет ніколи не показується: у перегляді лише «задано», у редагуванні — порожнє поле, порожнє = лишити.
    @ViewBuilder
    private func secret(_ title: String, key: String, text: Binding<String>, isSet: Bool) -> some View {
        let agent = agentKey(key)
        if editing {
            SettingsRow(title: title, symbol: "lock.fill", color: .gray) {
                SecretField(text: text, prompt: isOverridden(key) ? "з \(agent?.sourceLabel ?? "")" : isSet ? "задано, лишити" : "новий ключ")
                    .frame(maxWidth: 240)
                    .textFieldStyle(.roundedBorder)
            }
        } else {
            let shownSet = agent.map { $0.source != nil } ?? isSet
            sourced(title, symbol: "lock.fill", text: shownSet ? "задано" : "немає", source: agent?.sourceLabel ?? (isSet ? "relay.env" : nil))
        }
    }

    private var isDirty: Bool { draft != saved || !secrets.isEmpty }

    /// Без жодного з ключів агент relay не підніме: кожен має бути у формі, у relay.env або в Envify / process.env.
    private var canSave: Bool {
        (!draft.workspace.isEmpty || isOverridden(Key.workspace))
            && (!draft.destId.isEmpty || isOverridden(Key.destId))
            && (!draft.room.isEmpty || isOverridden(Key.room))
            && (saved.hasWorkspaceToken || !secrets.workspaceToken.isEmpty || isOverridden(Key.workspaceToken))
            && (saved.hasTicketKey || !secrets.ticketKey.isEmpty || isOverridden(Key.ticketKey))
    }

    private func save() {
        do {
            try model.saveRelaySettings(draft, secrets: secrets)
            saved = RelaySettingsStore.load()
            draft = saved
            secrets = RelaySecrets()
            saveError = nil
            editing = false
        } catch {
            saveError = error.localizedDescription
        }
    }

    private func cancel() {
        draft = saved
        secrets = RelaySecrets()
        saveError = nil
        editing = false
    }
}
