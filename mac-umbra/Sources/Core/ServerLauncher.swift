import Foundation

/// R1: one shared server, never killed by this app. Only when no server is alive (no socket and the pid in
/// `server.json` is gone) it starts one the way the old app does: agent-dev on a dev build, otherwise the
/// old bundle's `agent.cjs` and `mc-helper`.
enum ServerLauncher {
    static let support = FileManager.default.homeDirectoryForCurrentUser
        .appendingPathComponent("Library/Application Support/MaControl")
    static let socketPath = support.appendingPathComponent("server.sock").path
    static let serverInfo = support.appendingPathComponent("server.json")
    static let logURL = FileManager.default.homeDirectoryForCurrentUser.appendingPathComponent(".config/awake/agent.log")
    private static var lastAttempt = Date.distantPast

    static var isDevBuild: Bool { Bundle.main.bundleIdentifier?.hasSuffix(".dev") ?? true }

    /// The old MaControl bundle: dev id on a dev build, release id otherwise.
    static var oldBundle: URL? {
        let id = isDevBuild ? "dev.vitalii.macontrol.dev" : "dev.vitalii.macontrol"
        if let url = NSWorkspaceLookup.url(forBundleId: id) { return url }
        let fallback = URL(fileURLWithPath: "/Applications/MaControl.app")
        return FileManager.default.fileExists(atPath: fallback.path) ? fallback : nil
    }

    static var serverAlive: Bool {
        guard let data = try? Data(contentsOf: serverInfo),
              let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let pid = json["pid"] as? Int32 ?? (json["pid"] as? Int).map(Int32.init) else { return false }
        return kill(pid, 0) == 0
    }

    /// Called after a failed connect. Launches at most once per 20 s and never while a server pid is alive.
    static func launchIfNeeded() -> String? {
        guard Date().timeIntervalSince(lastAttempt) > 20 else { return nil }
        lastAttempt = Date()
        guard !serverAlive else { return nil }
        let devDir = support.appendingPathComponent("agent-dev")
        let bundled = oldBundle?.appendingPathComponent("Contents/Resources/agent")
        let dir: URL
        if isDevBuild, FileManager.default.fileExists(atPath: devDir.appendingPathComponent("agent.cjs").path) {
            dir = devDir
        } else if let bundled, FileManager.default.fileExists(atPath: bundled.appendingPathComponent("agent.cjs").path) {
            dir = bundled
        } else {
            return "Немає agent.cjs ні в agent-dev, ні в MaControl.app"
        }
        guard let node = NodeFinder.find() else { return "Не знайдено Node 22+" }
        let process = Process()
        process.executableURL = node
        process.arguments = [dir.appendingPathComponent("agent.cjs").path]
        var env = ProcessInfo.processInfo.environment
        env["MACONTROL_WEB_DIR"] = dir.appendingPathComponent("web").path
        env["NODE_NO_WARNINGS"] = "1"
        env["MACONTROL_STANDALONE"] = "1"
        env["MACONTROL_HELPER"] = oldBundle?.appendingPathComponent("Contents/MacOS/mc-helper").path
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

/// Bundle lookup without importing AppKit into Core.
enum NSWorkspaceLookup {
    static func url(forBundleId id: String) -> URL? {
        let task = Process()
        task.executableURL = URL(fileURLWithPath: "/usr/bin/mdfind")
        task.arguments = ["kMDItemCFBundleIdentifier == '\(id)'"]
        let pipe = Pipe()
        task.standardOutput = pipe
        guard (try? task.run()) != nil else { return nil }
        task.waitUntilExit()
        let out = String(decoding: pipe.fileHandleForReading.readDataToEndOfFile(), as: UTF8.self)
        return out.split(separator: "\n").first.map { URL(fileURLWithPath: String($0)) }
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
