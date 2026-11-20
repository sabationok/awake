import Foundation

/// Пороги захисту. Єдине джерело: аппка передає їх скрипту через змінні середовища.
/// Агент може змінити їх (`awake.batteryStop`, `awake.batteryWarn`), тож значення в UserDefaults.
enum SafetyLimits {
    private enum Key {
        static let batteryWarn = "safety.batteryWarn"
        static let batteryStop = "safety.batteryStop"
    }

    /// Попередження про низький заряд, %.
    static var batteryWarn: Int {
        get { UserDefaults.standard.object(forKey: Key.batteryWarn) as? Int ?? 25 }
        set { UserDefaults.standard.set(newValue, forKey: Key.batteryWarn) }
    }

    /// Сесія завершується і сон повертається, %.
    static var batteryStop: Int {
        get { UserDefaults.standard.object(forKey: Key.batteryStop) as? Int ?? 10 }
        set { UserDefaults.standard.set(newValue, forKey: Key.batteryStop) }
    }
}
