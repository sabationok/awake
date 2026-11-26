import SwiftUI

/// Ключі Upstash на сторінці «Web UI → Мережі»: вводяться лише на Mac. Список довірених мереж малює сервер.
struct UpstashSection: View {
    @EnvironmentObject private var model: AwakeModel
    @State private var upstashURL = ""
    @State private var upstashToken = ""
    @State private var saveError: String?

    var body: some View {
        Section {
            TextField("REST URL", text: $upstashURL, prompt: Text("https://….upstash.io"))
            LabeledContent("REST токен") {
                SecretField(text: $upstashToken, prompt: "токен з консолі Upstash")
            }
            HStack {
                if let saveError {
                    Text(saveError).foregroundStyle(.red)
                } else if model.agentSettings.hasUpstash {
                    Label("Підключено", systemImage: "checkmark.circle.fill").foregroundStyle(.green)
                }
                Spacer()
                Button("Зберегти") { save() }
                    .buttonStyle(.borderedProminent)
                    .disabled(!isDirty)
            }
        } header: {
            Text("Ключі Upstash (на цьому Mac)")
        } footer: {
            Text("Сюди агент кладе живий стан для Web UI на Vercel. Історія і журнал лишаються на Mac.")
        }
        .onAppear {
            upstashURL = model.agentSettings.upstashURL
            upstashToken = model.agentSettings.upstashToken
        }
    }

    private var isDirty: Bool {
        upstashURL != model.agentSettings.upstashURL || upstashToken != model.agentSettings.upstashToken
    }

    private func save() {
        var settings = model.agentSettings
        settings.upstashURL = upstashURL.trimmingCharacters(in: .whitespacesAndNewlines)
        settings.upstashToken = upstashToken.trimmingCharacters(in: .whitespacesAndNewlines)
        do {
            try model.saveAgentSettings(settings)
            saveError = nil
        } catch {
            saveError = error.localizedDescription
        }
    }
}
