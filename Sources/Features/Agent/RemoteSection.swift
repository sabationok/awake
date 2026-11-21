import SwiftUI

/// Сторінка «Підключення»: довірені мережі Wi-Fi (список у SQLite агента) і ключі Upstash. Вмикач агента — в AgentSection.
struct RemoteSection: View {
    @EnvironmentObject private var model: AwakeModel
    @State private var upstashURL = ""
    @State private var upstashToken = ""
    @State private var saveError: String?

    var body: some View {
        Section {
            if model.wifiAuthorized {
                SettingsRow(title: model.currentSSID ?? "Не підключено", symbol: "wifi", color: .blue) {
                    if let ssid = model.currentSSID {
                        Toggle("Довірена", isOn: Binding(
                            get: { model.trustedNetworks.contains(ssid) },
                            set: { model.setTrusted(ssid, $0) }
                        ))
                        .toggleStyle(.switch)
                    }
                }
            } else {
                SettingsRow(title: "Назва мережі недоступна", symbol: "wifi.exclamationmark", color: .orange) {
                    if model.wifiDenied {
                        Button("Відкрити налаштування…") {
                            NSWorkspace.shared.open(URL(string: "x-apple.systempreferences:com.apple.preference.security?Privacy_LocationServices")!)
                        }
                    } else {
                        Button("Дозволити") { model.wifi.requestAccess() }
                    }
                }
            }
            ForEach(model.trustedNetworks.filter { $0 != model.currentSSID }, id: \.self) { ssid in
                SettingsRow(title: ssid, symbol: "checkmark.shield.fill", color: .green) {
                    Button("Прибрати") { model.setTrusted(ssid, false) }
                }
            }
        } header: {
            Text("Довірені мережі Wi-Fi")
        } footer: {
            Text("macOS показує назву мережі лише застосункам з дозволом геолокації. Поза довіреними мережами агент відповідає тільки цьому Mac. Список зберігає агент у своїй базі, тож змінювати його можна, коли агент запущений.")
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
