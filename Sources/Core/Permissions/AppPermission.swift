import Foundation

/// Дозволи, які аппка використовує. Усі вони зараз живуть в одному правилі sudoers.
enum AppPermission: String, CaseIterable, Identifiable {
    /// Вмикає і вимикає сон Mac через `pmset -a disablesleep`.
    case sleepControl
    /// Читає тиск системи через `powermetrics --samplers thermal`.
    case thermalRead

    var id: String { rawValue }

    var title: String {
        switch self {
        case .sleepControl: "Керування сном"
        case .thermalRead: "Читання температури"
        }
    }

    var purpose: String {
        switch self {
        case .sleepControl: "Блокує сон на час сесії і повертає його після таймера, заряду чи перегріву."
        case .thermalRead: "Дає статус тиску системи і сигнали про нагрівання. Без нього температура недоступна."
        }
    }
}

extension AppModule {
    /// Дозволи, які модуль декларує. Модуль не може використати інші.
    var permissions: [AppPermission] {
        switch self {
        case .awake: [.sleepControl, .thermalRead]
        case .systemMonitor: [.thermalRead]
        }
    }
}
