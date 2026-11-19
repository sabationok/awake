import Foundation

struct LogEntry: Identifiable, Equatable {
    let id = UUID()
    let date: Date
    let text: String
}

/// Журнал у ~/.config/awake/awake.log: один рядок = ISO-дата, таб, текст.
/// Записи, старші за `retention`, прибираються при завантаженні і при дописуванні.
enum LogStore {
    static let url = FileManager.default.homeDirectoryForCurrentUser
        .appendingPathComponent(".config/awake/awake.log")
    static let retention: TimeInterval = 30 * 86400

    private static let iso = ISO8601DateFormatter()

    static func load(now: Date = Date()) -> [LogEntry] {
        guard let text = try? String(contentsOf: url, encoding: .utf8) else { return [] }
        let all = text.split(separator: "\n").compactMap(parse)
        let fresh = prune(all, now: now)
        if fresh.count != all.count { rewrite(fresh) }
        return fresh
    }

    static func append(_ entry: LogEntry) {
        let line = "\(iso.string(from: entry.date))\t\(entry.text)\n"
        guard let data = line.data(using: .utf8) else { return }
        let fm = FileManager.default
        try? fm.createDirectory(at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
        if let handle = try? FileHandle(forWritingTo: url) {
            defer { try? handle.close() }
            _ = try? handle.seekToEnd()
            try? handle.write(contentsOf: data)
        } else {
            try? data.write(to: url)
        }
    }

    static func prune(_ entries: [LogEntry], now: Date = Date()) -> [LogEntry] {
        let cutoff = now.addingTimeInterval(-retention)
        return entries.filter { $0.date >= cutoff }
    }

    static func rewrite(_ entries: [LogEntry]) {
        let body = entries.map { "\(iso.string(from: $0.date))\t\($0.text)" }.joined(separator: "\n")
        try? (body.isEmpty ? "" : body + "\n").write(to: url, atomically: true, encoding: .utf8)
    }

    private static func parse(_ line: Substring) -> LogEntry? {
        let parts = line.split(separator: "\t", maxSplits: 1)
        guard parts.count == 2, let date = iso.date(from: String(parts[0])) else { return nil }
        return LogEntry(date: date, text: String(parts[1]))
    }
}
