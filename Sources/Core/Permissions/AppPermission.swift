import Foundation

/// Системні дозволи Mac-аппки. Усі вони зараз живуть в одному правилі sudoers.
/// Raw value збігається з `MacPermission` у контракті: модулі агента просять їх за цими іменами.
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

    var symbol: String {
        switch self {
        case .sleepControl: "moon.zzz.fill"
        case .thermalRead: "thermometer.medium"
        }
    }

    var purpose: String {
        switch self {
        case .sleepControl: "Блокує сон на час сесії і повертає його після таймера, заряду чи перегріву."
        case .thermalRead: "Дає статус тиску системи і сигнали про нагрівання. Без нього температура недоступна."
        }
    }

    /// Команди з правила sudoers, які покриває дозвіл.
    var commands: [String] {
        switch self {
        case .sleepControl: ["pmset -a disablesleep 0", "pmset -a disablesleep 1"]
        case .thermalRead: ["powermetrics -n 1 -i 500 --samplers thermal"]
        }
    }
}
