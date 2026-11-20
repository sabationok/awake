import Foundation

/// Події, які скрипт може надіслати в Telegram. Raw value — `<domain>.<type>`, як у TG_EVENTS і в агенті;
/// скрипт сам мапить на них свої `event=start`, `battery_low`…
enum TelegramEvent: String, CaseIterable, Identifiable {
    case start = "awake.start"
    case stop = "awake.stop"
    case power = "system.power"
    case batteryLow = "system.batteryLow"
    case thermal = "system.thermal"

    /// Старі назви в telegram.env до `<domain>.<type>`.
    static func find(_ name: String) -> TelegramEvent? {
        let legacy: [String: TelegramEvent] = [
            "start": .start, "stop": .stop, "power": .power, "battery_low": .batteryLow, "thermal": .thermal,
        ]
        return TelegramEvent(rawValue: name) ?? legacy[name]
    }

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
