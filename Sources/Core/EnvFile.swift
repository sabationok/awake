import Foundation

/// Файл `KEY='value'` у ~/.config/awake, який читає агент. Права 600; чужі рядки й коментарі при записі лишаються.
enum EnvFile {
    enum WriteError: LocalizedError {
        case invalidCharacter
        var errorDescription: String? { "недопустимий символ ' або перенос рядка" }
    }

    static func read(_ url: URL) -> [String: String] {
        guard let text = try? String(contentsOf: url, encoding: .utf8) else { return [:] }
        var values: [String: String] = [:]
        for line in text.split(separator: "\n") {
            let parts = line.split(separator: "=", maxSplits: 1).map(String.init)
            guard parts.count == 2, let name = keyName(String(line)) else { continue }
            values[name] = parts[1].trimmingCharacters(in: CharacterSet(charactersIn: "'\" "))
        }
        return values
    }

    /// Рядки з ключами `updates` замінюються на місці, нові дописуються в порядку `order`.
    static func write(_ url: URL, updates: [String: String], order: [String], header: String) throws {
        let updates = updates.mapValues { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
        guard updates.values.allSatisfy({ !$0.contains("'") && !$0.contains("\n") }) else { throw WriteError.invalidCharacter }

        var lines = ((try? String(contentsOf: url, encoding: .utf8)) ?? "# \(header)\n").components(separatedBy: "\n")
        if lines.last == "" { lines.removeLast() }
        var pending = updates
        lines = lines.map { line in
            guard let name = keyName(line), let value = pending.removeValue(forKey: name) else { return line }
            return "\(name)='\(value)'"
        }
        for name in order {
            if let value = pending[name] { lines.append("\(name)='\(value)'") }
        }

        try FileManager.default.createDirectory(at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
        try (lines.joined(separator: "\n") + "\n").write(to: url, atomically: true, encoding: .utf8)
        try FileManager.default.setAttributes([.posixPermissions: 0o600], ofItemAtPath: url.path)
    }

    private static func keyName(_ line: String) -> String? {
        let trimmed = line.trimmingCharacters(in: .whitespaces)
        guard !trimmed.hasPrefix("#"), let equals = trimmed.firstIndex(of: "=") else { return nil }
        return String(trimmed[..<equals]).trimmingCharacters(in: .whitespaces)
    }
}
