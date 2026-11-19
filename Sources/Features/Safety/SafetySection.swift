import SwiftUI

/// Пороги захисту, згруповані за модулем.
struct SafetySection: View {
    @EnvironmentObject private var model: AwakeModel

    var body: some View {
        Section("Awake") {
            Toggle(isOn: $model.lockOnLidClose) {
                Label {
                    Text("Блокувати екран при закритті кришки")
                    Text("Під час сесії Mac не засинає, тому система сама не вимагатиме пароль")
                        .font(.caption).foregroundStyle(.secondary)
                } icon: {
                    Image(systemName: "lock.laptopcomputer").foregroundStyle(.blue)
                }
            }
            SettingsRow(title: "Повернути сон при заряді", symbol: "battery.0", color: .red,
                        text: "\(SafetyLimits.batteryStop)%")
            SettingsRow(title: "Повернути сон при перегріві", symbol: "flame.fill", color: .orange,
                        text: "Критичний")
        }
        Section("Стан Mac") {
            SettingsRow(title: "Попередження про заряд", symbol: "battery.25", color: .yellow,
                        text: "\(SafetyLimits.batteryWarn)%")
        }
    }
}
