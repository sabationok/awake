import Foundation

/// Останні рядки агента (дерево UI, пристрої) на диску. При запуску аппка одразу малює їх, а свіжі від агента
/// приходять слідом і тихо замінюють: меню і сторінки не стрибають, поки агент стартує.
enum AgentCache {
    enum Kind: String { case tree, devices }

    private static let directory = FileManager.default.homeDirectoryForCurrentUser
        .appendingPathComponent(".config/awake/cache", isDirectory: true)

    private static func url(_ kind: Kind) -> URL {
        directory.appendingPathComponent("\(kind.rawValue).json")
    }

    /// Зберігає рядок протоколу. Однаковий з попереднім не переписує. Файли лише для власника (0600, тека 0700).
    static func save(_ kind: Kind, line: String) {
        guard last[kind] != line, let stored = sanitized(kind, line: line) else { return }
        last[kind] = line
        let manager = FileManager.default
        try? manager.createDirectory(at: directory, withIntermediateDirectories: true,
                                     attributes: [.posixPermissions: 0o700])
        guard (try? Data(stored.utf8).write(to: url(kind), options: .atomic)) != nil else { return }
        try? manager.setAttributes([.posixPermissions: 0o600], ofItemAtPath: url(kind).path)
    }

    /// Агента вимкнули: його сторінки й пристрої на диску більше не потрібні.
    static func clear() {
        last = [:]
        try? FileManager.default.removeItem(at: directory)
    }

    /// Посилання з кодом сполучення і запити «Це ви?» на диск не йдуть: код живе хвилини, а читати його
    /// з файлу ніхто не має. Замість них — «завантаження», поки агент не дасть свіжі.
    private static func sanitized(_ kind: Kind, line: String) -> String? {
        guard kind == .devices else { return line }
        guard var envelope = (try? JSONSerialization.jsonObject(with: Data(line.utf8))) as? [String: Any],
              var data = envelope["data"] as? [String: Any] else { return nil }
        data["pairing"] = ["url": NSNull(), "reason": "loading"]
        data["requests"] = [Any]()
        envelope["data"] = data
        guard let json = try? JSONSerialization.data(withJSONObject: envelope) else { return nil }
        return String(decoding: json, as: UTF8.self)
    }

    /// Розбирає збережений рядок тим самим парсером, що й живі. Зіпсований чи старий формат — nil.
    static func load(_ kind: Kind) -> AgentProtocol.Incoming? {
        guard let data = try? Data(contentsOf: url(kind)) else { return nil }
        let line = String(decoding: data, as: UTF8.self)
        last[kind] = line
        return AgentProtocol.parse(line)
    }

    private static var last: [Kind: String] = [:]
}
