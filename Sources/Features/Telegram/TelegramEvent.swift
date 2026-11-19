import Foundation

/// Події, які скрипт може надіслати в Telegram. Raw value збігається з `event=` у скрипті.
enum TelegramEvent: String, CaseIterable, Identifiable {
    case start, stop, power
    case batteryLow = "battery_low"
    case thermal

    var id: String { rawValue }

    /// Модуль, якому належить подія.
    var module: AppModule {
        switch self {
        case .start, .stop: .awake
        case .power, .batteryLow, .thermal: .systemMonitor
        }
    }

    var title: String {
        switch self {
        case .start: "Початок сесії"
        case .stop: "Кінець сесії"
        case .power: "Живлення увімкнено або вимкнено"
        case .batteryLow: "Низький заряд"
        case .thermal: "Нагрівання"
        }
    }

    var symbol: String {
        switch self {
        case .start: "cup.and.saucer.fill"
        case .stop: "moon.fill"
        case .power: "powerplug.fill"
        case .batteryLow: "battery.25percent"
        case .thermal: "thermometer.medium"
        }
    }
}
