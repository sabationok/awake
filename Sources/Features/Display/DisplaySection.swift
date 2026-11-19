import SwiftUI

struct DisplaySection: View {
    @EnvironmentObject private var model: AwakeModel

    var body: some View {
        Section {
            SettingsRow(title: "Гасити екран під час сесії", symbol: "display", color: .blue) {
                Picker("", selection: $model.displayOff) {
                    ForEach(DisplayOffOption.all) { Text($0.title).tag($0) }
                }
                .labelsHidden()
                .fixedSize()
            }
            HStack {
                Spacer()
                Button("Погасити зараз") { model.turnDisplayOff() }
            }
        } header: {
            Text("Екран")
        } footer: {
            Text("Із закритою кришкою вбудований екран гасне одразу. Цей параметр діє, коли кришка відкрита або підключено зовнішній монітор. «Як у системі» означає налаштування з розділу «Замкнений екран».")
        }
    }
}
