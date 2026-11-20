import SwiftUI

/// Сторінка «Пульт»: агент, довірені мережі Wi-Fi і ключі Upstash.
struct RemoteSection: View {
    @EnvironmentObject private var model: AwakeModel
    @State private var upstashURL = ""
    @State private var upstashToken = ""
    @State private var saveError: String?

    var body: some View {
        Section {
            SettingsRow(title: "Агент", symbol: "server.rack", color: .indigo) {
                HStack(spacing: 10) {
                    Text(model.agentStatus.statusText).foregroundStyle(statusColor)
                    Toggle("", isOn: $model.agentEnabled).toggleStyle(.switch).labelsHidden()
                }
            }
            if case .running(let port) = model.agentStatus {
                SettingsRow(title: "Адреса в мережі", symbol: "network", color: .blue,
                            text: model.currentNetworkTrusted ? "порт \(port), видно в довіреній Wi-Fi" : "лише на цьому Mac")
            }
        } header: {
            Text("Пульт")
        } footer: {
            Text("Агент веде історію сесій і журнал у SQLite та роздає пульт у локальній мережі. Дашборд на Vercel бачить лише стан, а посилання на пульт показує тільки коли Mac у довіреній Wi-Fi.")
        }

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
            Text("macOS показує назву мережі лише застосункам з дозволом геолокації. Поза довіреними мережами агент відповідає тільки цьому Mac.")
        }

        Section {
            TextField("REST URL", text: $upstashURL, prompt: Text("https://….upstash.io"))
            SecureField("REST токен", text: $upstashToken)
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

    private var statusColor: Color {
        if case .failed = model.agentStatus { return .red }
        return .secondary
    }
}
