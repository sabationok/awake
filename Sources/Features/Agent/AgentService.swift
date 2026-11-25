import Foundation

/// Запускає агента (Node, agent.cjs) дочірнім процесом і говорить з ним JSON-рядками: стан і журнал у stdin,
/// команди Web UI зі stdout. stderr агента йде в agent.log. Агент береться з бандла (Resources/agent), а в
/// не-production збірці — із зовнішньої папки, якщо вона є: тоді сервер перезбирається окремо від аппки
/// (`pnpm agent:dev`), і аппка сама перезапускає лише його процес, коли файл змінився.
@MainActor
final class AgentService {
    enum Status: Equatable {
        case stopped
        case starting
        case running(port: Int)
        case failed(String)
    }

    private(set) var status = Status.stopped { didSet { onStatus?(status) } }
    var onStatus: ((Status) -> Void)?
    var onCommand: ((AgentCommand) -> Void)?
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

    private var process: Process?
    private var input: FileHandle?
    /// Байти, а не рядок: багатобайтовий символ може розірватися між двома читаннями pipe.
    private var buffer = Data()
    private var wantRunning = false
    private var crashes = 0
    /// Звідки і яку версію агента запущено: шлях і час зміни agent.cjs.
    private var runningSource: String?
    /// Процес зупиняємо самі, щоб підняти нову версію: це не падіння.
    private var restarting = false
    private var sourceTimer: Timer?

    static let logURL = FileManager.default.homeDirectoryForCurrentUser.appendingPathComponent(".config/awake/agent.log")

    /// Каталог агента в бандлі: agent.cjs і web/ зі статичним Web UI.
    static var bundleDirectory: URL? {
        guard let url = Bundle.main.resourceURL?.appendingPathComponent("agent"),
              FileManager.default.fileExists(atPath: url.appendingPathComponent("agent.cjs").path) else { return nil }
        return url
    }

    /// Агент, який розробник зібрав окремо від аппки (`pnpm agent:dev`): agent.cjs, web/ і паспорт збірки.
    static let externalDirectory = FileManager.default.homeDirectoryForCurrentUser
        .appendingPathComponent("Library/Application Support/MaControl/agent-dev")

    /// Зовнішню папку бачить лише не-production збірка: production завжди запускає вшитого агента.
    static var usesExternalAgent: Bool {
        guard (Bundle.main.object(forInfoDictionaryKey: "MCStage") as? String ?? "production") != "production" else { return false }
        return FileManager.default.fileExists(atPath: externalDirectory.appendingPathComponent("agent.cjs").path)
    }

    /// Каталог, з якого агент запускається зараз: зовнішній (dev) або з бандла.
    static var activeDirectory: URL? {
        usesExternalAgent ? externalDirectory : bundleDirectory
    }

    /// Підпис джерела: шлях і час зміни agent.cjs. Змінився — агента треба перезапустити.
    private static func sourceSignature() -> String? {
        guard let file = activeDirectory?.appendingPathComponent("agent.cjs"),
              let modified = (try? FileManager.default.attributesOfItem(atPath: file.path))?[.modificationDate] as? Date else { return nil }
        return "\(file.path)@\(modified.timeIntervalSince1970)"
    }

    func start(settings: AgentSettings) {
        wantRunning = true
        watchSource()
        guard process == nil else { return }
        guard let directory = Self.activeDirectory else {
            status = .failed("агента немає в збірці")
            return
        }
        guard let node = NodeLocator.find(preferred: settings.nodePath) else {
            status = .failed("не знайдено Node 22+")
            return
        }

        var env = AgentSettingsStore.environment(settings)
        env["MACONTROL_WEB_DIR"] = directory.appendingPathComponent("web").path
        env["NODE_NO_WARNINGS"] = "1"

        let proc = Process()
        proc.executableURL = node
        proc.arguments = [directory.appendingPathComponent("agent.cjs").path]
        proc.environment = env

        let stdin = Pipe()
        let stdout = Pipe()
        proc.standardInput = stdin
        proc.standardOutput = stdout
        FileManager.default.createFile(atPath: Self.logURL.path, contents: nil)
        proc.standardError = try? FileHandle(forWritingTo: Self.logURL)

        stdout.fileHandleForReading.readabilityHandler = { [weak self] handle in
            let chunk = handle.availableData
            Task { @MainActor in self?.consume(chunk) }
        }
        proc.terminationHandler = { [weak self] finished in
            stdout.fileHandleForReading.readabilityHandler = nil
            let code = finished.terminationStatus
            Task { @MainActor in self?.processEnded(code: code) }
        }

        do {
            try proc.run()
            process = proc
            runningSource = Self.sourceSignature()
            input = stdin.fileHandleForWriting
            buffer = Data()
            status = .starting
        } catch {
            status = .failed(error.localizedDescription)
        }
    }

    /// Раз на кілька секунд звіряє джерело агента із запущеним. Лише там, де зовнішня папка взагалі можлива.
    private func watchSource() {
        guard sourceTimer == nil, (Bundle.main.object(forInfoDictionaryKey: "MCStage") as? String ?? "production") != "production" else { return }
        sourceTimer = Timer.scheduledTimer(withTimeInterval: 2, repeats: true) { [weak self] _ in
            Task { @MainActor in self?.checkSource() }
        }
    }

    /// Нова версія agent.cjs (або папку ввімкнули / прибрали): перезапускаємо лише процес агента.
    private func checkSource() {
        guard wantRunning, !restarting, let current = Self.sourceSignature(), current != runningSource else { return }
        crashes = 0
        guard process != nil else {
            start(settings: AgentSettingsStore.load())
            return
        }
        restarting = true
        try? input?.close()
        input = nil
        process?.terminate()
    }

    func stop() {
        wantRunning = false
        sourceTimer?.invalidate()
        sourceTimer = nil
        // Закритий stdin — сигнал агенту завершитись самому.
        try? input?.close()
        input = nil
        process?.terminate()
    }

    func send<T: Encodable>(type: String, data: T) {
        guard let input, let line = AgentProtocol.line(type: type, data: data) else { return }
        // Агент міг щойно впасти: запис у закритий pipe кидає помилку, а не валить аппку.
        try? input.write(contentsOf: line)
    }

    /// Натискання в SwiftUI-рендерері: агент виконує його так само, як з вебу.
    func sendEvent(_ event: UiEvent) {
        send(type: "event", data: event)
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
                crashes = 0
                status = .running(port: port)
            case .command(let command):
                onCommand?(command)
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

    private func processEnded(code: Int32) {
        process = nil
        input = nil
        guard wantRunning else {
            restarting = false
            status = .stopped
            return
        }
        if restarting {
            restarting = false
            status = .starting
            start(settings: AgentSettingsStore.load())
            return
        }
        // Впав сам: кілька спроб перезапуску з паузою, далі показуємо помилку.
        crashes += 1
        guard crashes <= 3 else {
            status = .failed("агент завершився з кодом \(code), див. agent.log")
            return
        }
        status = .starting
        DispatchQueue.main.asyncAfter(deadline: .now() + 5) { [weak self] in
            guard let self, self.wantRunning else { return }
            self.start(settings: AgentSettingsStore.load())
        }
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
