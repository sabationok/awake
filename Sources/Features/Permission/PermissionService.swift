import AppKit

/// Правило sudoers, яке дозволяє без пароля лише три команди з фіксованими аргументами.
/// Встановлюється і прибирається через системний діалог пароля.
enum PermissionService {
    enum Outcome {
        case done
        case cancelled
        case failed(String)
    }

    static let sudoersPath = "/etc/sudoers.d/awake"
    private static let stagedPath = "/etc/sudoers.d/.awake.tmp"

    static let allowedCommands = [
        "/usr/bin/pmset -a disablesleep 0",
        "/usr/bin/pmset -a disablesleep 1",
        "/usr/bin/powermetrics -n 1 -i 500 --samplers thermal",
    ]

    static func isGranted() -> Bool {
        Shell.run("/usr/bin/sudo", ["-n", "-l", "/usr/bin/pmset", "-a", "disablesleep", "0"]).succeeded
    }

    @MainActor
    static func grant() -> Outcome {
        let user = NSUserName()
        guard user.range(of: #"^[A-Za-z0-9._-]+$"#, options: .regularExpression) != nil else {
            return .failed("несподіване ім'я користувача")
        }
        let rule = """
        # Awake: дозволяє лише ці команди без пароля
        \(user) ALL=(root) NOPASSWD: \(allowedCommands.joined(separator: ", "))

        """
        let tmp = FileManager.default.temporaryDirectory
            .appendingPathComponent("awake-sudoers-\(UUID().uuidString)")
        do { try rule.write(to: tmp, atomically: true, encoding: .utf8) } catch {
            return .failed(error.localizedDescription)
        }
        defer { try? FileManager.default.removeItem(at: tmp) }

        // Файли з крапкою в назві sudo ігнорує. Тому спершу кладемо копію root-власника,
        // перевіряємо її visudo і лише потім атомарно перейменовуємо.
        let command = "/usr/bin/install -m 440 -o root -g wheel '\(tmp.path)' \(stagedPath) && "
            + "/usr/sbin/visudo -cf \(stagedPath) >/dev/null && /bin/mv -f \(stagedPath) \(sudoersPath) || "
            + "{ /bin/rm -f \(stagedPath); exit 1; }"
        return runAsAdmin(command, prompt: "Awake хоче отримати дозвіл керувати сном Mac.")
    }

    @MainActor
    static func revoke() -> Outcome {
        runAsAdmin("/bin/rm -f \(sudoersPath)", prompt: "Awake хоче прибрати свій дозвіл керувати сном.")
    }

    /// Одна команда від root через стандартне вікно пароля macOS.
    @MainActor
    private static func runAsAdmin(_ command: String, prompt: String) -> Outcome {
        let source = "do shell script \"\(escape(command))\" with prompt \"\(escape(prompt))\" with administrator privileges"
        var error: NSDictionary?
        NSAppleScript(source: source)?.executeAndReturnError(&error)
        guard let error else { return .done }
        if error[NSAppleScript.errorNumber] as? Int == -128 { return .cancelled }
        return .failed(error[NSAppleScript.errorMessage] as? String ?? "невідома помилка")
    }

    private static func escape(_ s: String) -> String {
        s.replacingOccurrences(of: "\\", with: "\\\\").replacingOccurrences(of: "\"", with: "\\\"")
    }
}
