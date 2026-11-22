import SwiftUI

/// Модалка вебхука: нова або зміна наявного. Секретів тут немає: токен воркспейсу й ключ JWT — у «Ключі аппки».
struct WebhookFormSheet: View {
    @EnvironmentObject private var model: AwakeModel
    @Environment(\.dismiss) private var dismiss
    @State private var input: WebhookInput
    @State private var confirmDelete = false
    private let isNew: Bool

    init(webhook: AgentWebhook?) {
        _input = State(initialValue: webhook.map(WebhookInput.init) ?? WebhookInput())
        isNew = webhook == nil
    }

    var body: some View {
        VStack(spacing: 0) {
            Form {
                Section {
                    Picker("Тип", selection: $input.type) {
                        ForEach(AgentWebhook.Kind.allCases) { Text($0.title).tag($0) }
                    }
                    .disabled(!isNew)
                    Picker("Режим", selection: $input.mode) {
                        ForEach(AgentWebhook.Mode.allCases) { Text($0.rawValue).tag($0) }
                    }
                    LabeledContent("Provider", value: input.provider.rawValue)
                } footer: {
                    Text(modeHint)
                }
                Section("Webhooxy") {
                    TextField("Workspace", text: $input.workspace, prompt: Text("slug воркспейсу"))
                    TextField("Destination", text: $input.destId, prompt: Text("id DEST-а"))
                    if input.type == .relay {
                        TextField("Room", text: $input.room, prompt: Text("room DEST-а"))
                    }
                    TextField("ID вебхука", text: $input.whId, prompt: Text("згенерує агент"))
                }
            }
            .formStyle(.grouped)
            HStack {
                if !isNew {
                    Button("Прибрати", role: .destructive) { confirmDelete = true }
                }
                Spacer()
                Button("Скасувати") { dismiss() }
                    .keyboardShortcut(.cancelAction)
                Button("Зберегти") { save() }
                    .buttonStyle(.borderedProminent)
                    .disabled(!input.isValid)
                    .keyboardShortcut(.defaultAction)
            }
            .padding()
        }
        .frame(width: 460, height: 440)
        .onChange(of: input.type) { _, type in input.provider = type.provider }
        .confirmationDialog("Прибрати вебхук \(input.type.title)?", isPresented: $confirmDelete) {
            Button("Прибрати", role: .destructive) {
                if let id = input.id { model.deleteWebhook(id) }
                dismiss()
            }
        } message: {
            Text("Агент перестане ним користуватись. У webhooxy він лишиться, поки його не вимкнути там.")
        }
    }

    private var modeHint: String {
        switch input.mode {
        case .stream: "stream — постійний потік: relay, події Envify."
        case .oneshot: "oneshot — разові посилання: що саме, каже code у payload."
        }
    }

    private func save() {
        var input = input
        input.provider = input.type.provider
        model.saveWebhook(input)
        dismiss()
    }
}
