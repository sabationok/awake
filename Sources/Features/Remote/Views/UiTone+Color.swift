import SwiftUI

extension UiTone {
    /// Єдине місце, де тон стає кольором.
    var color: Color {
        switch self {
        case .accent: .accentColor
        case .green: .green
        case .orange: .orange
        case .red: .red
        case .gray: .gray
        case .indigo: .indigo
        case .yellow: .yellow
        }
    }
}
