import Foundation

/// Групи подій Telegram у налаштуваннях скрипта. Дозволи модулів сюди не належать: їх декларує агент.
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
