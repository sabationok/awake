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

    /// Зберігає рядок протоколу як є. Однаковий з попереднім не переписує.
    static func save(_ kind: Kind, line: String) {
        guard last[kind] != line else { return }
        last[kind] = line
        try? FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        try? Data(line.utf8).write(to: url(kind), options: .atomic)
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
