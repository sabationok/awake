import Foundation

/// Аппка — клієнт сервера, як Web UI. Сервер (Node, agent.cjs) працює окремим процесом і живе далі, коли аппка
/// закрита; до macOS він ходить через свій помічник (mc-helper), не через аппку. Тут лише дві речі:
/// підключитись до локального сокета сервера і, якщо сервер не запущений або запущена стара збірка, підняти його.
/// Протокол — JSON-рядки: знімки (дерево, стан, пристрої…) від сервера, натискання й запити до нього.
/// Сервер береться з бандла (Resources/agent), а в не-production збірці — із зовнішньої папки, якщо вона є
/// (`pnpm agent:dev`): нова збірка там перезапускає лише сервер.
@MainActor
final class AgentService {
    enum Status: Equatable {
        case stopped
        case starting
        case running(port: Int)
        case failed(String)
    }

    private(set) var status = Status.stopped { didSet { if status != oldValue { onStatus?(status) } } }
    var onStatus: ((Status) -> Void)?
    var onState: ((ServerMacState) -> Void)?
    var onPermissions: ((ServerPermissions) -> Void)?
    var onTree: ((UiTree) -> Void)?
    var onSettings: (([String: UiScalar]) -> Void)?
    var onDevices: ((AgentDevices) -> Void)?
    var onSecrets: ((AgentSecrets) -> Void)?
    var onTrustedNetworks: (([String]) -> Void)?
    var onWebhooks: (([AgentWebhook]) -> Void)?
    var onServerInfo: ((AgentServerInfo) -> Void)?
    var onServerCharts: ((AgentServerCharts) -> Void)?
    var onServerChartsTick: ((AgentServerChartsTick) -> Void)?
    var onChartTick: ((UiChartTick) -> Void)?
    /// З'єднання щойно встановлено: час надіслати серверу те, що знає лише аппка.
    var onConnected: (() -> Void)?

    private var connection: FileHandle?
    /// Байти, а не рядок: багатобайтовий символ може розірватися між двома читаннями.
    private var buffer = Data()
    private var wantRunning = false
    private var settings = AgentSettings()
    private var timer: Timer?
    /// Коли востаннє запускали сервер: поки він піднімається, другого не стартуємо.
    private var launchedAt = Date.distantPast
    private var disconnectedSince = Date()

    /// Скільки чекаємо на щойно запущений сервер, перш ніж пробувати знову.
    private static let launchGrace: TimeInterval = 15
    /// Після цього часу без з'єднання показуємо помилку (і далі пробуємо).
    private static let failAfter: TimeInterval = 30

    static let logURL = FileManager.default.homeDirectoryForCurrentUser.appendingPathComponent(".config/awake/agent.log")
    nonisolated private static let supportDirectory = FileManager.default.homeDirectoryForCurrentUser
        .appendingPathComponent("Library/Application Support/MaControl")
    /// Сокет сервера для аппки і паспорт запущеного сервера: шляхи ті самі, що в config сервера.
    nonisolated static let socketURL = supportDirectory.appendingPathComponent("server.sock")
    nonisolated static let serverInfoURL = supportDirectory.appendingPathComponent("server.json")

    /// Каталог сервера в бандлі: agent.cjs і web/ зі статичним Web UI.
    static var bundleDirectory: URL? {
        guard let url = Bundle.main.resourceURL?.appendingPathComponent("agent"),
              FileManager.default.fileExists(atPath: url.appendingPathComponent("agent.cjs").path) else { return nil }
        return url
    }

    /// Сервер, який розробник зібрав окремо від аппки (`pnpm agent:dev`): agent.cjs, web/ і паспорт збірки.
    static let externalDirectory = supportDirectory.appendingPathComponent("agent-dev")

    /// Зовнішню папку бачить лише не-production збірка: production завжди запускає вшитий сервер.
    static var usesExternalAgent: Bool {
        guard (Bundle.main.object(forInfoDictionaryKey: "MCStage") as? String ?? "production") != "production" else { return false }
        return FileManager.default.fileExists(atPath: externalDirectory.appendingPathComponent("agent.cjs").path)
    }

    /// Каталог, з якого сервер має працювати зараз: зовнішній (dev) або з бандла.
    static var activeDirectory: URL? {
        usesExternalAgent ? externalDirectory : bundleDirectory
    }

    /// Помічник на чистому Swift лежить поруч із виконуваним файлом аппки.
    static var helperURL: URL? {
        Bundle.main.executableURL?.deletingLastPathComponent().appendingPathComponent("mc-helper")
    }

    // MARK: керування

    func start(settings: AgentSettings) {
        self.settings = settings
        wantRunning = true
        if connection == nil {
            status = .starting
            disconnectedSince = Date()
        }
        guard timer == nil else { return }
        timer = Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { [weak self] _ in
            Task { @MainActor in self?.tick() }
        }
        tick()
    }

    /// Власник вимкнув сервер: зупиняємо і сам процес.
    func stop() {
        wantRunning = false
        timer?.invalidate()
        timer = nil
        closeConnection()
        if let info = ServerInfoFile.read(), info.isAlive { kill(info.pid, SIGTERM) }
        status = .stopped
    }

    /// Аппка закривається: сервер працює далі, бот і Web UI лишаються доступними.
    func disconnect() {
        timer?.invalidate()
        timer = nil
        closeConnection()
    }

    func send<T: Encodable>(type: String, data: T) {
        guard let connection, let line = AgentProtocol.line(type: type, data: data) else { return }
        // Сервер міг щойно зупинитись: запис у закритий сокет кидає помилку, а не валить аппку.
        try? connection.write(contentsOf: line)
    }

    /// Натискання в SwiftUI-рендерері: сервер виконує його так само, як з вебу.
    func sendEvent(_ event: UiEvent) {
        send(type: "event", data: event)
    }

    // MARK: сервер і з'єднання

    /// Щосекунди: сервер тієї збірки, що треба, запущений? Якщо так і з'єднання немає — підключаємось.
    private func tick() {
        guard wantRunning else { return }
        guard let directory = Self.activeDirectory else {
            status = .failed("сервера немає в збірці")
            return
        }
        let script = directory.appendingPathComponent("agent.cjs")
        if let info = ServerInfoFile.read(), info.isAlive {
            guard info.matches(script, helper: Self.helperURL) else {
                // Працює інша збірка (стара аппка або нова версія з `pnpm agent:dev`): зупиняємо, наступний тік запустить потрібну.
                kill(info.pid, SIGTERM)
                closeConnection()
                launchedAt = .distantPast
                return
            }
            if connection == nil { connect() }
        } else if connection == nil, Date().timeIntervalSince(launchedAt) > Self.launchGrace {
            launch(script: script, directory: directory)
        }
        if connection == nil, Date().timeIntervalSince(disconnectedSince) > Self.failAfter {
            status = .failed("сервер не відповідає, див. agent.log")
        }
    }

    private func launch(script: URL, directory: URL) {
        guard let node = NodeLocator.find(preferred: settings.nodePath) else {
            status = .failed("не знайдено Node 22+")
            return
        }
        var env = AgentSettingsStore.environment(settings)
        env["MACONTROL_WEB_DIR"] = directory.appendingPathComponent("web").path
        env["NODE_NO_WARNINGS"] = "1"
        env["MACONTROL_STANDALONE"] = "1"
        env["MACONTROL_HELPER"] = Self.helperURL?.path
        env["MACONTROL_APP_SOCKET"] = Self.socketURL.path
        env["MACONTROL_SERVER_INFO"] = Self.serverInfoURL.path

        let proc = Process()
        proc.executableURL = node
        proc.arguments = [script.path]
        proc.environment = env
        // Сервер не залежить від аппки: stdin порожній, вивід у журнал. Закриття аппки його не зупиняє.
        proc.standardInput = FileHandle.nullDevice
        FileManager.default.createFile(atPath: Self.logURL.path, contents: nil)
        let log = try? FileHandle(forWritingTo: Self.logURL)
        proc.standardOutput = log
        proc.standardError = log
        do {
            try proc.run()
            launchedAt = Date()
            status = .starting
        } catch {
            status = .failed(error.localizedDescription)
        }
    }

    private func connect() {
        guard let descriptor = Self.openSocket(Self.socketURL.path) else { return }
        let handle = FileHandle(fileDescriptor: descriptor, closeOnDealloc: true)
        buffer = Data()
        connection = handle
        handle.readabilityHandler = { [weak self] handle in
            let chunk = handle.availableData
            Task { @MainActor in
                guard let self, self.connection === handle else { return }
                // Порожнє читання — сервер закрив з'єднання.
                if chunk.isEmpty { self.connectionLost() } else { self.consume(chunk) }
            }
        }
        onConnected?()
    }

    private func connectionLost() {
        closeConnection()
        guard wantRunning else { return }
        status = .starting
        disconnectedSince = Date()
    }

    private func closeConnection() {
        connection?.readabilityHandler = nil
        try? connection?.close()
        connection = nil
    }

    /// Unix-сокет, відкритий на читання й запис; nil, якщо сервер ще не слухає.
    private static func openSocket(_ path: String) -> Int32? {
        let descriptor = socket(AF_UNIX, SOCK_STREAM, 0)
        guard descriptor >= 0 else { return nil }
        var address = sockaddr_un()
        address.sun_family = sa_family_t(AF_UNIX)
        let bytes = Array(path.utf8)
        // Структура обнулена, тож рядок шляху вже завершений нулем.
        guard bytes.count < MemoryLayout.size(ofValue: address.sun_path) else { close(descriptor); return nil }
        withUnsafeMutableBytes(of: &address.sun_path) { $0.copyBytes(from: bytes) }
        let size = socklen_t(MemoryLayout<sockaddr_un>.size)
        let result = withUnsafePointer(to: &address) { pointer in
            pointer.withMemoryRebound(to: sockaddr.self, capacity: 1) { Darwin.connect(descriptor, $0, size) }
        }
        guard result == 0 else { close(descriptor); return nil }
        var on: Int32 = 1
        setsockopt(descriptor, SOL_SOCKET, SO_NOSIGPIPE, &on, socklen_t(MemoryLayout<Int32>.size))
        return descriptor
    }

    /// Рядок декодується лише цілим, тож кирилиця в дереві не псується на межі читання.
    private func consume(_ chunk: Data) {
        buffer.append(chunk)
        while let newline = buffer.firstIndex(of: 0x0A) {
            let line = String(decoding: buffer[buffer.startIndex..<newline], as: UTF8.self)
            buffer.removeSubrange(buffer.startIndex...newline)
            guard let message = AgentProtocol.parse(line) else { continue }
            switch message {
            case .ready(let port):
                status = .running(port: port)
            case .state(let state):
                onState?(state)
            case .permissions(let permissions):
                onPermissions?(permissions)
            case .tree(let tree):
                AgentCache.save(.tree, line: line)
                onTree?(tree)
            case .settings(let settings):
                onSettings?(settings)
            case .devices(let devices):
                AgentCache.save(.devices, line: line)
                onDevices?(devices)
            case .secrets(let secrets):
                onSecrets?(secrets)
            case .trustedNetworks(let ssids):
                onTrustedNetworks?(ssids)
            case .webhooks(let webhooks):
                onWebhooks?(webhooks)
            case .server(let info):
                onServerInfo?(info)
            case .serverCharts(let charts):
                onServerCharts?(charts)
            case .serverChartsTick(let tick):
                onServerChartsTick?(tick)
            case .chartTick(let tick):
                onChartTick?(tick)
            case .other:
                break
            }
        }
    }
}

/// Паспорт запущеного сервера, який він сам пише поруч із сокетом: pid і файл збірки.
struct ServerInfoFile: Decodable {
    let pid: pid_t
    let script: String
    let scriptModifiedAt: Double?
    /// Помічник, з яким сервер запущено: він частина сервера, тож інша його збірка теж потребує перезапуску.
    let helper: String?
    let helperModifiedAt: Double?

    static func read() -> ServerInfoFile? {
        guard let data = try? Data(contentsOf: AgentService.serverInfoURL) else { return nil }
        return try? JSONDecoder().decode(ServerInfoFile.self, from: data)
    }

    var isAlive: Bool { kill(pid, 0) == 0 }

    /// Сервер запущено саме з цього файла і цим помічником, і жоден із них відтоді не змінювався.
    func matches(_ file: URL, helper helperFile: URL?) -> Bool {
        guard Self.same(file, path: script, modifiedAt: scriptModifiedAt) else { return false }
        guard let helperFile else { return true }
        return Self.same(helperFile, path: helper, modifiedAt: helperModifiedAt)
    }

    private static func same(_ file: URL, path: String?, modifiedAt: Double?) -> Bool {
        guard path == file.path,
              let modified = (try? FileManager.default.attributesOfItem(atPath: file.path))?[.modificationDate] as? Date
        else { return false }
        return abs(modified.timeIntervalSince1970 - (modifiedAt ?? 0)) < 1
    }
}

/// Пошук Node 22+ (потрібен вбудований node:sqlite): шлях з налаштувань, Homebrew, nvm.
enum NodeLocator {
    static func find(preferred: String) -> URL? {
        var candidates = [preferred, "/opt/homebrew/bin/node", "/usr/local/bin/node"].filter { !$0.isEmpty }
        let nvm = FileManager.default.homeDirectoryForCurrentUser.appendingPathComponent(".nvm/versions/node")
        if let versions = try? FileManager.default.contentsOfDirectory(atPath: nvm.path) {
            let sorted = versions.sorted { $0.compare($1, options: .numeric) == .orderedDescending }
            candidates += sorted.map { nvm.appendingPathComponent($0).appendingPathComponent("bin/node").path }
        }
        return candidates
            .filter { FileManager.default.isExecutableFile(atPath: $0) && majorVersion(of: $0) >= 22 }
            .map { URL(fileURLWithPath: $0) }
            .first
    }

    private static func majorVersion(of path: String) -> Int {
        let output = Shell.run(path, ["-v"]).output.trimmingCharacters(in: .whitespacesAndNewlines)
        return Int(output.dropFirst().split(separator: ".").first ?? "") ?? 0
    }
}
