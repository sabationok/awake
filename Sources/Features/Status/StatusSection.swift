import SwiftUI

struct StatusSection: View {
    @EnvironmentObject private var model: AwakeModel

    var body: some View {
        Section("Стан") {
            SettingsRow(title: "Сон", symbol: "moon.fill", color: .indigo) {
                HStack(spacing: 6) {
                    StatusDot(active: model.sleepBlocked)
                    Text(model.sleepBlocked ? "Заблоковано" : "Працює звично")
                        .foregroundStyle(.secondary)
                }
            }
            SettingsRow(title: "Батарея", symbol: model.power.symbol, color: .green, text: model.power.summary)
            SettingsRow(title: "Температура", symbol: "thermometer.medium", color: model.thermal.color) {
                Text(model.thermal.title)
                    .foregroundStyle(model.thermal == .nominal ? Color.secondary : model.thermal.color)
            }
        }
    }
}
