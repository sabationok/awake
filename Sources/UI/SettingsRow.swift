import SwiftUI

/// Рядок «іконка і назва зліва, значення справа».
struct SettingsRow<Value: View>: View {
    let title: String
    let symbol: String
    let color: Color
    @ViewBuilder var value: () -> Value

    var body: some View {
        LabeledContent {
            value()
        } label: {
            Label {
                Text(title)
            } icon: {
                SettingsIcon(symbol: symbol, color: color)
            }
        }
    }
}

extension SettingsRow where Value == Text {
    /// Рядок зі звичайним сірим текстом справа.
    init(title: String, symbol: String, color: Color, text: String) {
        self.init(title: title, symbol: symbol, color: color) {
            Text(text).foregroundStyle(.secondary)
        }
    }
}
