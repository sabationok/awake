import SwiftUI

/// Сторінка «Підключення»: довірені мережі Wi-Fi (список у SQLite агента) і ключі Upstash. Вмикач агента — в AgentSection.
struct RemoteSection: View {
    @EnvironmentObject private var model: AwakeModel
    @State private var upstashURL = ""
    @State private var upstashToken = ""
    @State private var saveError: String?

    var body: some View {
        Section {
            if let ssid = model.currentSSID, !model.trustedNetworks.contains(ssid) {
                SettingsRow(title: ssid, symbol: "wifi", color: .blue) {
                    HStack(spacing: 8) {
                        Text("зараз тут").foregroundStyle(.secondary)
                        Button("Додати") { model.setTrusted(ssid, true) }
                    }
                }
            }
            ForEach(model.trustedNetworks, id: \.self) { ssid in
                SettingsRow(title: ssid, symbol: "checkmark.shield.fill", color: .green) {
                    HStack(spacing: 8) {
                        if ssid == model.currentSSID { Text("зараз тут").foregroundStyle(.secondary) }
                        Button("Прибрати") { model.setTrusted(ssid, false) }
                    }
                }
            }
            if model.trustedNetworks.isEmpty && model.currentSSID == nil {
                Text("Довірених мереж немає").foregroundStyle(.secondary)
            }
        } header: {
            Text("Довірені мережі Wi-Fi")
        } footer: {
            Text(model.wifiAuthorized
                 ? "Поза довіреними мережами агент відповідає тільки цьому Mac. Список зберігає агент у своїй базі."
                 : "Поточну мережу не видно: потрібен дозвіл геолокації на сторінці «Дозвіл». Поза довіреними мережами агент відповідає тільки цьому Mac.")
        }

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
            Text("Upstash")
        } footer: {
            Text("Сюди агент кладе живий стан для дашборду на Vercel. Історія і журнал лишаються на Mac.")
        }
        .onAppear {
            upstashURL = model.agentSettings.upstashURL
            upstashToken = model.agentSettings.upstashToken
            model.refreshWifi()
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
