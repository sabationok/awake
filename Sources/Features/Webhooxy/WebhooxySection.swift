import SwiftUI

/// «Ключі» webhooxy на головній вкладці Webhooxy: relay.env редагує лише аппка, секрети в дерево агента не йдуть.
struct WebhooxySection: View {
    @EnvironmentObject private var model: AwakeModel
    @State private var saved = RelaySettings()
    @State private var draft = RelaySettings()
    @State private var secrets = RelaySecrets()
    @State private var editing = false
    @State private var saveError: String?

    var body: some View {
        Section {
            if editing {
                editor
            } else {
                summary
            }
        } header: {
            Text("Ключі")
        } footer: {
            Text("Зберігаються в ~/.config/awake/relay.env лише на цьому Mac; агент перепідключається одразу. Ключі з Envify (process.env) мають пріоритет над файлом.")
        }
        .animation(.default, value: editing)
        .onAppear {
            saved = RelaySettingsStore.load()
            draft = saved
            editing = !saved.isConfigured
        }
    }

    @ViewBuilder
    private var summary: some View {
        SettingsRow(title: "Webhooxy", symbol: "key.fill", color: .indigo) {
            HStack(spacing: 10) {
                Text("\(saved.workspace) · \(saved.destId)").foregroundStyle(.secondary)
                Button("Змінити…") { editing = true }
            }
        }
    }

    @ViewBuilder
    private var editor: some View {
        field("Workspace", symbol: "building.2", text: $draft.workspace, prompt: "slug воркспейсу")
        field("Destination", symbol: "arrow.triangle.branch", text: $draft.destId, prompt: "id DEST-а")
        field("Room", symbol: "door.left.hand.open", text: $draft.room, prompt: "room DEST-а")
        SettingsRow(title: "Токен воркспейсу", symbol: "lock.fill", color: .gray) {
            SecretField(text: $secrets.workspaceToken, prompt: saved.hasWorkspaceToken ? "задано, лишити" : "WEBHOOXY_WORKSPACE_TOKEN")
                .frame(maxWidth: 240)
                .textFieldStyle(.roundedBorder)
        }
        SettingsRow(title: "Ключ квитків", symbol: "lock.fill", color: .gray) {
            SecretField(text: $secrets.ticketKey, prompt: saved.hasTicketKey ? "задано, лишити" : "WEBHOOXY_JWT_TICKET_KEY")
                .frame(maxWidth: 240)
                .textFieldStyle(.roundedBorder)
        }
        HStack {
            if let saveError { Text(saveError).foregroundStyle(.red) }
            Spacer()
            if saved.isConfigured {
                Button("Скасувати") { cancel() }
            }
            Button("Зберегти") { save() }
                .buttonStyle(.borderedProminent)
                .disabled(!isDirty || !canSave)
                .keyboardShortcut(.defaultAction)
        }
    }

    private func field(_ title: String, symbol: String, text: Binding<String>, prompt: String) -> some View {
        SettingsRow(title: title, symbol: symbol, color: .gray) {
            TextField("", text: text, prompt: Text(prompt))
                .frame(maxWidth: 240)
                .textFieldStyle(.roundedBorder)
                .multilineTextAlignment(.trailing)
        }
    }

    private var isDirty: Bool { draft != saved || !secrets.isEmpty }

    /// Без жодного з ключів агент relay не підніме, тож зберігати неповний набір немає сенсу.
    private var canSave: Bool {
        !draft.workspace.isEmpty && !draft.destId.isEmpty && !draft.room.isEmpty
            && (saved.hasWorkspaceToken || !secrets.workspaceToken.isEmpty)
            && (saved.hasTicketKey || !secrets.ticketKey.isEmpty)
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
