import Foundation

/// Модулі мака-менеджера. Події Telegram і пороги захисту групуються за модулем.
enum AppModule: String, CaseIterable, Identifiable {
    /// Керування сном: початок і кінець сесії, повернення сну.
    case awake
    /// Моніторинг мака: живлення, заряд, температура.
    case systemMonitor

    var id: String { rawValue }

    var title: String {
        switch self {
        case .awake: "Awake"
        case .systemMonitor: "Стан Mac"
        }
    }
}
