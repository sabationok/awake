import SwiftUI

/// Пороги захисту, згруповані за модулем.
struct SafetySection: View {
    var body: some View {
        Section("Awake") {
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
