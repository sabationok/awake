import Foundation

/// Одна сесія з журналу: від `event=start` до `event=stop`.
struct SessionRecord: Identifiable, Equatable {
    let start: Date
    var end: Date?
    var plannedDuration: String
    var batteryStart: Int?
    var batteryEnd: Int?
    var reason: String?

    var id: Date { start }
    var actualSeconds: TimeInterval? { end.map { $0.timeIntervalSince(start) } }
}

/// Збирає сесії з рядків журналу. Незавершена сесія (аппку закрили під час сесії) лишається без кінця.
enum SessionHistory {
    static func sessions(from entries: [LogEntry]) -> [SessionRecord] {
        var result: [SessionRecord] = []
        var open: SessionRecord?
        for entry in entries {
            switch field("event", in: entry.text) {
            case "start":
                if let unfinished = open { result.append(unfinished) }
                open = SessionRecord(
                    start: entry.date,
                    end: nil,
                    plannedDuration: field("duration", in: entry.text) ?? "—",
                    batteryStart: field("battery", in: entry.text).flatMap(Int.init),
                    batteryEnd: nil,
                    reason: nil
                )
            case "stop":
                if var current = open {
                    current.end = entry.date
                    current.batteryEnd = field("battery", in: entry.text).flatMap(Int.init)
                    current.reason = field("reason", in: entry.text)
                    result.append(current)
                    open = nil
                }
            default:
                break
            }
        }
        if let open { result.append(open) }
        return result
    }

    /// Сумарний час сесій з відомим кінцем, наприклад «3 год 20 хв».
    static func totalText(_ sessions: [SessionRecord]) -> String {
        let seconds = Int(sessions.compactMap(\.actualSeconds).reduce(0, +))
        return "\(seconds / 3600) год \((seconds % 3600) / 60) хв"
    }

    /// Значення ключа `key=...` з рядка журналу. Значення може містити пробіли, але закінчується перед наступним ключем.
    static func field(_ key: String, in text: String) -> String? {
        let pattern = "\\b\(key)=(.*?)(?=\\s+[a-z_]+=|\\)\\s*$|$)"
        guard let regex = try? NSRegularExpression(pattern: pattern),
              let match = regex.firstMatch(in: text, range: NSRange(text.startIndex..., in: text)),
              let range = Range(match.range(at: 1), in: text) else { return nil }
        return String(text[range]).trimmingCharacters(in: .whitespaces)
    }
}
