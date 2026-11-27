import AppKit
import Foundation

/// Starts the server from this app's own bundle (agent-dev first on a dev / preview build) and restarts it when a
/// different build is running, like the old app (`AgentService.tick`): the server writes `server.json` with the
/// script and helper it runs, and a server that does not match ours gets SIGTERM, then ours starts.
enum ServerLauncher {
    static let support = FileManager.default.homeDirectoryForCurrentUser
        .appendingPathComponent("Library/Application Support/MaControl")
    static let socketPath = support.appendingPathComponent("server.sock").path
    static let serverInfo = support.appendingPathComponent("server.json")
    static let logURL = FileManager.default.homeDirectoryForCurrentUser.appendingPathComponent(".config/awake/agent.log")
    /// Throttle for both the launch and the SIGTERM: at most once per 20 s.
    static let throttle: TimeInterval = 20
    private static var lastAttempt = Date.distantPast
    private static var lastKill = Date.distantPast

    /// `MCStage` from Info.plist (dev | preview | production); a binary outside a bundle counts as dev.
    static var stage: String { Bundle.main.object(forInfoDictionaryKey: "MCStage") as? String ?? "dev" }
    static var usesAgentDev: Bool {
        stage != "production" && FileManager.default.fileExists(atPath: agentDev.appendingPathComponent("agent.cjs").path)
    }
    static let agentDev = support.appendingPathComponent("agent-dev")
    static var bundled: URL? {
        let dir = Bundle.main.resourceURL?.appendingPathComponent("agent")
        guard let dir, FileManager.default.fileExists(atPath: dir.appendingPathComponent("agent.cjs").path) else { return nil }
        return dir
    }
    static var activeDirectory: URL? { usesAgentDev ? agentDev : bundled }
    static var helperURL: URL? {
        let url = Bundle.main.executableURL?.deletingLastPathComponent().appendingPathComponent("mc-helper")
        guard let url, FileManager.default.isExecutableFile(atPath: url.path) else { return nil }
        return url
    }

    /// The old MaControl app still running (its bundle ids, at any path other than this app's own bundle): it
    /// restarts any server that is not its own, so while it runs this app only connects and never sends SIGTERM
    /// (no ping-pong of restarts). The path check keeps it right once this app takes over the old ids.
    static var oldAppRunning: Bool {
        ["dev.vitalii.macontrol", "dev.vitalii.macontrol.dev"].contains { id in
            NSRunningApplication.runningApplications(withBundleIdentifier: id).contains {
                $0.bundleURL?.standardizedFileURL != Bundle.main.bundleURL.standardizedFileURL
            }
        }
    }

    /// Every couple of seconds while the app runs. A server of another build is stopped; the next failed connect
    /// starts ours. Returns a note for the owner or nil.
    static func checkRunning() -> String? {
        guard let dir = activeDirectory else { return "Сервера немає в збірці" }
        guard let info = ServerInfoFile.read(), info.isAlive else { return nil }
        guard !info.matches(dir.appendingPathComponent("agent.cjs"), helper: helperURL) else { return nil }
        if oldAppRunning { return nil }
        guard Date().timeIntervalSince(lastKill) > throttle else { return nil }
        lastKill = Date()
        kill(info.pid, SIGTERM)
        lastAttempt = .distantPast
        return nil
    }

    /// Called after a failed connect. Launches at most once per 20 s and never while a server pid is alive.
    static func launchIfNeeded() -> String? {
        guard Date().timeIntervalSince(lastAttempt) > throttle else { return nil }
        if let info = ServerInfoFile.read(), info.isAlive { return nil }
        lastAttempt = Date()
        guard let dir = activeDirectory else { return "Немає agent.cjs ні в agent-dev, ні в збірці" }
        guard let helper = helperURL else { return "Немає mc-helper у збірці" }
        guard let node = NodeFinder.find() else { return "Не знайдено Node 22+" }
        let process = Process()
        process.executableURL = node
        process.arguments = [dir.appendingPathComponent("agent.cjs").path]
        var env = ProcessInfo.processInfo.environment
        env["MACONTROL_WEB_DIR"] = dir.appendingPathComponent("web").path
        env["NODE_NO_WARNINGS"] = "1"
        env["MACONTROL_STANDALONE"] = "1"
        env["MACONTROL_HELPER"] = helper.path
        env["MACONTROL_APP_SOCKET"] = socketPath
        env["MACONTROL_SERVER_INFO"] = serverInfo.path
        process.environment = env
        process.standardInput = FileHandle.nullDevice
        FileManager.default.createFile(atPath: logURL.path, contents: nil)
        if let log = try? FileHandle(forWritingTo: logURL) {
            log.seekToEndOfFile()
            process.standardOutput = log
            process.standardError = log
        }
        do { try process.run() } catch { return "Сервер не запустився: \(error.localizedDescription)" }
        return nil
    }
}

/// The running server's passport, written by the server next to its socket (`mac-app-channel.service.ts`).
struct ServerInfoFile: Decodable {
    let pid: pid_t
    let script: String
    let scriptModifiedAt: Double?
    let helper: String?
    let helperModifiedAt: Double?

    static func read() -> ServerInfoFile? {
        guard let data = try? Data(contentsOf: ServerLauncher.serverInfo) else { return nil }
        return try? JSONDecoder().decode(ServerInfoFile.self, from: data)
    }

    var isAlive: Bool { kill(pid, 0) == 0 }

    /// Started from exactly this script and this helper, and neither changed since.
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

/// Node 22+ from nvm, Homebrew or /usr/local, newest first.
enum NodeFinder {
    static func find() -> URL? {
        let fm = FileManager.default
        let nvm = fm.homeDirectoryForCurrentUser.appendingPathComponent(".nvm/versions/node")
        var candidates: [String] = []
        if let versions = try? fm.contentsOfDirectory(atPath: nvm.path) {
            let sorted = versions.compactMap { v -> (Int, String)? in
                guard let major = Int(v.dropFirst().split(separator: ".").first ?? "") else { return nil }
                return (major, v)
            }.filter { $0.0 >= 22 }.sorted { $0.0 > $1.0 }
            candidates += sorted.map { nvm.appendingPathComponent("\($0.1)/bin/node").path }
        }
        candidates += ["/opt/homebrew/bin/node", "/usr/local/bin/node"]
        return candidates.first { fm.isExecutableFile(atPath: $0) }.map(URL.init(fileURLWithPath:))
    }
}
