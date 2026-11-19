import Foundation

/// Bash-скрипт awake усередині бандла. Уся логіка сесії живе в ньому,
/// тож аппка і команда `awake` у терміналі поводяться однаково.
enum AwakeScript {
    static let url = Bundle.main.url(forResource: "awake", withExtension: nil)!

    /// Середовище: пороги з `SafetyLimits` і дозвіл на читання температури.
    static var environment: [String: String] {
        var env = ProcessInfo.processInfo.environment
        env["AWAKE_BATT_WARN"] = String(SafetyLimits.batteryWarn)
        env["AWAKE_BATT_STOP"] = String(SafetyLimits.batteryStop)
        env["AWAKE_THERMAL"] = PermissionGate.thermalForScript ? "1" : "0"
        return env
    }

    /// Короткі підкоманди: off, status, test.
    static func run(_ command: String, _ args: String...) -> Shell.Result {
        Shell.run("/bin/bash", [url.path, command] + args, environment: environment)
    }

    static let pidFile = FileManager.default.homeDirectoryForCurrentUser
        .appendingPathComponent(".config/awake/session.pid")

    /// Чи працює зараз будь-яка сесія скрипта: з аппки чи з терміналу.
    static var sessionAlive: Bool {
        guard let text = try? String(contentsOf: pidFile, encoding: .utf8),
              let pid = pid_t(text.trimmingCharacters(in: .whitespacesAndNewlines))
        else { return false }
        return kill(pid, 0) == 0
    }
}
