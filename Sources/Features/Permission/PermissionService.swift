import AppKit

/// Кожен системний дозвіл — окреме правило sudoers із фіксованими командами без пароля.
/// Видається і прибирається через системний діалог пароля.
enum PermissionService {
    enum Outcome {
        case done
        case cancelled
        case failed(String)
    }

    private static let directory = "/etc/sudoers.d"
    /// Префікс наших правил у системі: `mc-<дозвіл>`. Нічого в системі Mac не називається «awake».
    private static let prefix = "mc-"

    private static func path(_ permission: AppPermission) -> String {
        "\(directory)/\(prefix)\(permission.rawValue)"
    }

    /// Файли з крапкою в назві sudo ігнорує, тому чернетка лежить поруч і не діє до перейменування.
    private static func stagedPath(_ permission: AppPermission) -> String {
        "\(directory)/.\(prefix)\(permission.rawValue).tmp"
    }

    /// Старі імена: спільне правило `awake` (до 1.4) і `awake-<дозвіл>`. Прибираються при кожній зміні правил.
    private static var legacyPaths: [String] {
        ["\(directory)/awake"] + AppPermission.allCases.map { "\(directory)/awake-\($0.rawValue)" }
    }

    /// Є правила під старими іменами. /etc/sudoers.d читається всім, вміст файлів — ні, тож досить імені.
    static var hasLegacyRules: Bool {
        legacyPaths.contains { FileManager.default.fileExists(atPath: $0) }
    }

    /// Один раз переносить видані дозволи на імена `mc-*`: та сама дія адміністратора, що й видача.
    /// Набір дозволів не змінюється; до переносу старі правила працюють далі.
    @MainActor
    static func migrateLegacyRules() -> Outcome {
        apply(granted(), prompt: "MaControl перейменовує свої правила sudoers на mc-*. Дозволи не змінюються.")
    }

    /// Команди правила з повними шляхами, як їх викликає аппка.
    private static func sudoCommands(_ permission: AppPermission) -> [String] {
        switch permission {
        case .sleepControl: ["/usr/bin/pmset -a disablesleep 0", "/usr/bin/pmset -a disablesleep 1"]
        case .thermalRead: ["/usr/bin/powermetrics -n 1 -i 500 --samplers thermal"]
        }
    }

    /// Видано, якщо в sudo є правило NOPASSWD на всі команди дозволу (наше окреме чи старе спільне).
    /// `sudo -n -l <команда>` тут не годиться: для адміна з `(ALL) ALL` і свіжим паролем він «дозволяє» будь-що.
    static func isGranted(_ permission: AppPermission) -> Bool {
        isGranted(permission, in: passwordlessCommands())
    }

    static func granted() -> Set<AppPermission> {
        let commands = passwordlessCommands()
        return Set(AppPermission.allCases.filter { isGranted($0, in: commands) })
    }

    private static func isGranted(_ permission: AppPermission, in commands: Set<String>) -> Bool {
        sudoCommands(permission).allSatisfy(commands.contains)
    }

    /// Команди з правил NOPASSWD з `sudo -n -l`. Без жодного такого правила sudo просить пароль і список порожній.
    private static func passwordlessCommands() -> Set<String> {
        let result = Shell.run("/usr/bin/sudo", ["-n", "-l"])
        guard result.succeeded else { return [] }
        var commands = Set<String>()
        for line in result.output.split(separator: "\n") {
            guard let range = line.range(of: "NOPASSWD:") else { continue }
            for command in line[range.upperBound...].split(separator: ",") {
                commands.insert(command.trimmingCharacters(in: .whitespaces))
            }
        }
        return commands
    }

    @MainActor
    static func grant(_ permission: AppPermission) -> Outcome {
        apply(granted().union([permission]), prompt: "MaControl хоче отримати дозвіл «\(permission.title)».")
    }

    @MainActor
    static func revoke(_ permission: AppPermission) -> Outcome {
        apply(granted().subtracting([permission]), prompt: "MaControl хоче прибрати дозвіл «\(permission.title)».")
    }

    /// Приводить /etc/sudoers.d до набору `permissions` однією дією адміністратора:
    /// пише правило кожного дозволу з набору, видаляє решту і правила під старими іменами.
    @MainActor
    private static func apply(_ permissions: Set<AppPermission>, prompt: String) -> Outcome {
        let user = NSUserName()
        guard user.range(of: #"^[A-Za-z0-9._-]+$"#, options: .regularExpression) != nil else {
            return .failed("несподіване ім'я користувача")
        }
        var steps: [String] = []
        var temporary: [URL] = []
        defer { temporary.forEach { try? FileManager.default.removeItem(at: $0) } }

        for permission in AppPermission.allCases {
            guard permissions.contains(permission) else {
                steps.append("/bin/rm -f \(path(permission))")
                continue
            }
            let rule = """
            # MaControl: \(permission.title)
            \(user) ALL=(root) NOPASSWD: \(sudoCommands(permission).joined(separator: ", "))

            """
            let tmp = FileManager.default.temporaryDirectory
                .appendingPathComponent("mc-sudoers-\(permission.rawValue)-\(UUID().uuidString)")
            do { try rule.write(to: tmp, atomically: true, encoding: .utf8) } catch {
                return .failed(error.localizedDescription)
            }
            temporary.append(tmp)
            let staged = stagedPath(permission)
            // Копія root-власника, перевірка visudo, потім атомарне перейменування.
            steps.append("/usr/bin/install -m 440 -o root -g wheel '\(tmp.path)' \(staged)")
            steps.append("/usr/sbin/visudo -cf \(staged) >/dev/null")
            steps.append("/bin/mv -f \(staged) \(path(permission))")
        }
        steps.append("/bin/rm -f \(legacyPaths.joined(separator: " "))")

        let command = steps.joined(separator: " && ") + " || { /bin/rm -f \(directory)/.\(prefix)*.tmp; exit 1; }"
        return runAsAdmin(command, prompt: prompt)
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
