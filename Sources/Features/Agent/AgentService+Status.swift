import Foundation

extension AgentService.Status {
    /// Текст стану агента: рядок у «Пульт» і пояснення на сторінці, де агента немає.
    var statusText: String {
        switch self {
        case .stopped: "Вимкнено"
        case .starting: "Запуск…"
        case .running: "Працює"
        case .failed(let message): "Помилка: \(message)"
        }
    }

    var isRunning: Bool {
        if case .running = self { return true }
        return false
    }
}
