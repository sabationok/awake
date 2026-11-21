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
            field("Workspace", symbol: "building.2", text: $draft.workspace, value: saved.workspace, prompt: "slug воркспейсу")
            field("Destination", symbol: "arrow.triangle.branch", text: $draft.destId, value: saved.destId, prompt: "id DEST-а")
            field("Room", symbol: "door.left.hand.open", text: $draft.room, value: saved.room, prompt: "room DEST-а")
            secret("Токен воркспейсу", text: $secrets.workspaceToken, isSet: saved.hasWorkspaceToken)
            secret("Ключ квитків", text: $secrets.ticketKey, isSet: saved.hasTicketKey)
            buttons
        } header: {
            Text("Ключі")
        } footer: {
            Text("relay.env на цьому Mac; після збереження агент перепідключається. Ключі з Envify мають пріоритет над файлом.")
        }
        .animation(.default, value: editing)
        .onAppear {
            saved = RelaySettingsStore.load()
            draft = saved
            editing = !saved.isConfigured
        }
    }

    /// «Змінити» в перегляді; «Скасувати» + «Зберегти» в редагуванні.
    private var buttons: some View {
        HStack {
            if let saveError { Text(saveError).foregroundStyle(.red) }
            Spacer()
            if editing {
                if saved.isConfigured {
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

    @ViewBuilder
    private func field(_ title: String, symbol: String, text: Binding<String>, value: String, prompt: String) -> some View {
        if editing {
            SettingsRow(title: title, symbol: symbol, color: .gray) {
                TextField("", text: text, prompt: Text(prompt))
                    .frame(maxWidth: 240)
                    .textFieldStyle(.roundedBorder)
                    .multilineTextAlignment(.trailing)
            }
        } else {
            SettingsRow(title: title, symbol: symbol, color: .gray, text: value.isEmpty ? "немає" : value)
        }
    }

    /// Секрет ніколи не показується: у перегляді лише «задано», у редагуванні — порожнє поле, порожнє = лишити.
    @ViewBuilder
    private func secret(_ title: String, text: Binding<String>, isSet: Bool) -> some View {
        if editing {
            SettingsRow(title: title, symbol: "lock.fill", color: .gray) {
                SecretField(text: text, prompt: isSet ? "задано, лишити" : "новий ключ")
                    .frame(maxWidth: 240)
                    .textFieldStyle(.roundedBorder)
            }
        } else {
            SettingsRow(title: title, symbol: "lock.fill", color: .gray, text: isSet ? "задано" : "немає")
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
