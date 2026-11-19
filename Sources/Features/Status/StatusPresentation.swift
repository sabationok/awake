import SwiftUI

/// Як показувати батарею і температуру в інтерфейсі.

extension ProcessInfo.ThermalState {
    var title: String {
        switch self {
        case .nominal: "Норма"
        case .fair: "Тепло"
        case .serious: "Гаряче"
        case .critical: "Перегрів"
        @unknown default: "—"
        }
    }

    var color: Color {
        switch self {
        case .nominal: .teal
        case .fair: .yellow
        case .serious: .orange
        case .critical: .red
        @unknown default: .gray
        }
    }
}

extension PowerStatus {
    var percentText: String { percent.map { "\($0)%" } ?? "—" }
    var sourceText: String { onAC ? "від мережі" : "від батареї" }
    var summary: String { "\(percentText) · \(sourceText)" }

    var symbol: String {
        if onAC { return "battery.100.bolt" }
        switch percent ?? 100 {
        case ..<13: return "battery.0"
        case ..<38: return "battery.25"
        case ..<63: return "battery.50"
        case ..<88: return "battery.75"
        default: return "battery.100"
        }
    }
}
