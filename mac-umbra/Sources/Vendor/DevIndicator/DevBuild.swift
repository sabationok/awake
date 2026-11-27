import Foundation

/// Mirrors `contracts/dev-build.schema.json` (schemaVersion 1). Optional fields are optionals.
public struct DevBuild: Codable, Equatable, Sendable {
    public struct Project: Codable, Equatable, Sendable {
        public var id: String
        public var name: String
        public var variant: String?
        public var displayName: String
    }

    public struct Git: Codable, Equatable, Sendable {
        public var branch: String
        public var commit: String
        public var dirty: Bool
    }

    public struct Row: Codable, Equatable, Sendable {
        public var label: String
        public var value: String
    }

    public struct SDK: Codable, Equatable, Sendable {
        public var name: String
        public var version: String
    }

    public var schemaVersion: Int
    public var project: Project
    public var stage: DevStage
    public var version: String
    public var buildNumber: String?
    public var git: Git
    public var builtAt: String
    public var extra: [Row]?
    public var sdks: [SDK]?

    /// Spec §3: the indicator is hidden for production only.
    public var showsIndicator: Bool { stage != .production }

    public init(
        schemaVersion: Int = 1,
        project: Project,
        stage: DevStage,
        version: String,
        buildNumber: String? = nil,
        git: Git,
        builtAt: String,
        extra: [Row]? = nil,
        sdks: [SDK]? = nil
    ) {
        self.schemaVersion = schemaVersion
        self.project = project
        self.stage = stage
        self.version = version
        self.buildNumber = buildNumber
        self.git = git
        self.builtAt = builtAt
        self.extra = extra
        self.sdks = sdks
    }

    /// Reads `<resource>.json` from the bundle. Returns nil when the file is missing or invalid.
    public static func load(bundle: Bundle = .main, resource: String = "dev-build") -> DevBuild? {
        guard let url = bundle.url(forResource: resource, withExtension: "json") else { return nil }
        return try? load(url: url)
    }

    public static func load(url: URL) throws -> DevBuild {
        try decode(from: Data(contentsOf: url))
    }

    public static func decode(from data: Data) throws -> DevBuild {
        let build = try JSONDecoder().decode(DevBuild.self, from: data)
        guard build.schemaVersion == 1 else {
            throw DecodingError.dataCorrupted(.init(
                codingPath: [],
                debugDescription: "unsupported schemaVersion \(build.schemaVersion)"
            ))
        }
        return build
    }

    /// Pretty JSON of the passport, for «Копіювати паспорт».
    public func passportJSON() -> String {
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
        guard let data = try? encoder.encode(self), let text = String(data: data, encoding: .utf8) else {
            return ""
        }
        return text
    }
}

/// Stage is closed: an unknown value (e.g. "staging") fails decoding.
public enum DevStage: String, Codable, Sendable {
    case dev
    case preview
    case production
}

extension DevBuild {
    /// Local time, `dd.MM, HH:mm` (spec §3). Falls back to the raw string when unparseable.
    var builtAtLabel: String {
        guard let date = Self.parseISO(builtAt) else { return builtAt }
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = .current
        formatter.dateFormat = "dd.MM, HH:mm"
        return formatter.string(from: date)
    }

    private static func parseISO(_ text: String) -> Date? {
        let plain = ISO8601DateFormatter()
        if let date = plain.date(from: text) { return date }
        let fractional = ISO8601DateFormatter()
        fractional.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return fractional.date(from: text)
    }
}
