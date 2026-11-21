import SwiftUI

/// «Підключення» агента: вмикач і адреса в мережі. Малює аппка на головній вкладці модуля Агент,
/// а коли агент вимкнений і дерева немає — на нативній сторінці «Підключення», щоб його можна було ввімкнути.
struct AgentSection: View {
    @EnvironmentObject private var model: AwakeModel

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
            Text("Підключення")
        } footer: {
            Text("Агент веде історію сесій і журнал у SQLite та роздає пульт у локальній мережі. Дашборд на Vercel бачить лише стан, а посилання на пульт показує тільки коли Mac у довіреній Wi-Fi.")
        }
    }

    private var statusColor: Color {
        if case .failed = model.agentStatus { return .red }
        return .secondary
    }
}
