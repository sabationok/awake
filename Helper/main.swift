// Помічник MaControl: маленький процес на чистому Swift (без SwiftUI і AppKit), єдиний, хто звертається до macOS.
// Його запускає сервер (NestJS). Протокол — JSON-рядки: запити зі stdin, стан і відповіді в stdout
// (contracts/src/helper.ts). Помічник нічого не вирішує: виконує примітив і звітує стан.
// Системні сервіси — у Helper/System, список файлів у scripts/build-helper.sh.
import CoreWLAN
import Foundation
import LocalAuthentication

let helperVersion = "0.1.0"
/// Як часто стан іде серверу без запиту. Сервер вважає Mac офлайн після 30 с тиші.
let statePeriod: TimeInterval = 5

// MARK: вихід

/// Рядки пишуться з main-черги, тож не перемішуються.
func send(type: String, data: [String: Any]) {
    guard var line = try? JSONSerialization.data(withJSONObject: ["type": type, "data": data]) else { return }
    line.append(0x0A)
    FileHandle.standardOutput.write(line)
}

func orNull(_ value: Any?) -> Any { value ?? NSNull() }

func thermalName(_ state: ProcessInfo.ThermalState) -> String {
    switch state {
    case .nominal: "nominal"
    case .fair: "fair"
    case .serious: "serious"
    case .critical: "critical"
    @unknown default: "nominal"
    }
}

/// Видані в системі дозволи (правила sudoers). `sudo -n -l` важчий за решту стану, тож перечитується рідше.
var grantedPermissions = SudoersRules.granted()
var stateTicks = 0

func sendState() {
    stateTicks += 1
    if stateTicks % 3 == 0 { grantedPermissions = SudoersRules.granted() }
    let power = PowerService.battery()
    send(type: "state", data: [
        "host": Host.current().localizedName ?? "Mac",
        "battery": orNull(power.percent),
        "power": power.percent == nil ? "unknown" : (power.onAC ? "AC" : "BAT"),
        "thermal": thermalName(ProcessInfo.processInfo.thermalState),
        "lidClosed": ClamshellService.isClosed(),
        "sleepBlocked": PowerService.isSleepBlocked(),
        // Без дозволу геолокації macOS віддає nil; дозвіл помічник отримає окремим кроком.
        "ssid": orNull(CWWiFiClient.shared().interface()?.ssid()),
        "volume": orNull(SoundService.volume()),
        "muted": SoundService.isMuted() ?? false,
        "brightness": orNull(BrightnessService.brightness()),
        "idleSeconds": Int(DisplayService.idleSeconds()),
        "granted": grantedPermissions.map(\.rawValue).sorted(),
    ])
}

// MARK: запити

struct Request: Decodable {
    struct Body: Decodable {
        let id: String
        let action: String
        let value: Value?
        /// Назва дозволу для permissionGrant / permissionRevoke.
        let name: String?
    }

    enum Value: Decodable {
        case number(Double)
        case bool(Bool)

        init(from decoder: Decoder) throws {
            let container = try decoder.singleValueContainer()
            if let flag = try? container.decode(Bool.self) { self = .bool(flag) } else { self = .number(try container.decode(Double.self)) }
        }

        /// Відсоток 0…100.
        var percent: Int? {
            guard case .number(let raw) = self, (0.0...100.0).contains(raw) else { return nil }
            return Int(raw)
        }

        var flag: Bool? {
            guard case .bool(let flag) = self else { return nil }
            return flag
        }
    }

    let type: String
    let data: Body
}

/// nil — виконано; інакше текст помилки.
func perform(_ request: Request.Body) -> String? {
    switch request.action {
    case "lock":
        // false означає лише, що приватний виклик блокування недоступний: екран усе одно гасне.
        return LockService.lockAndSleepDisplay() ? nil : "lock unavailable, display turned off only"
    case "displayOff":
        DisplayService.sleepNow()
        return nil
    case "volume":
        guard let percent = request.value?.percent else { return "volume needs 0…100" }
        return SoundService.setVolume(percent) ? nil : "output device has no volume control"
    case "mute":
        guard let muted = request.value?.flag else { return "mute needs true or false" }
        return SoundService.setMuted(muted) ? nil : "output device has no mute control"
    case "brightness":
        guard let percent = request.value?.percent else { return "brightness needs 0…100" }
        return BrightnessService.setBrightness(percent) ? nil : "no built-in display"
    case "sleepDisabled":
        guard let disabled = request.value?.flag else { return "sleepDisabled needs true or false" }
        // -n: без правила sudoers (scripts/install.sh) sudo не питає пароль, а одразу відмовляє.
        let result = Shell.run("/usr/bin/sudo", ["-n", "/usr/bin/pmset", "-a", "disablesleep", disabled ? "1" : "0"])
        return result.succeeded ? nil : "no sudoers rule for pmset disablesleep"
    case "sleepNow":
        _ = Shell.run("/usr/bin/pmset", ["sleepnow"])
        return nil
    default:
        return "unknown action \(request.action)"
    }
}

/// Видати або відкликати дозвіл: системне вікно пароля може висіти довго, тож чекаємо його поза головною чергою.
func changePermission(_ request: Request.Body, grant: Bool) {
    guard let permission = request.name.flatMap(AppPermission.init(rawValue:)) else {
        return finish(request, error: "unknown permission \(request.name ?? "")")
    }
    DispatchQueue.global().async {
        let outcome = grant ? SudoersRules.grant(permission) : SudoersRules.revoke(permission)
        DispatchQueue.main.async {
            grantedPermissions = SudoersRules.granted()
            switch outcome {
            case .done: finish(request, error: nil)
            case .cancelled: finish(request, error: "cancelled")
            case .failed(let message): finish(request, error: message)
            }
        }
    }
}

/// Touch ID або пароль Mac: системне вікно висить, доки власник не відповість, тож чекаємо поза головною чергою.
/// `.deviceOwnerAuthentication` сам переходить на пароль, коли Touch ID немає чи він заблокований.
func authenticate(_ request: Request.Body) {
    let context = LAContext()
    var failure: NSError?
    guard context.canEvaluatePolicy(.deviceOwnerAuthentication, error: &failure) else {
        return finish(request, error: failure?.localizedDescription ?? "authentication unavailable")
    }
    let reason = request.name.flatMap { $0.isEmpty ? nil : $0 } ?? "підтвердити дію MaControl"
    context.evaluatePolicy(.deviceOwnerAuthentication, localizedReason: reason) { success, error in
        DispatchQueue.main.async {
            if success { return finish(request, error: nil) }
            let code = (error as? LAError)?.code
            let cancelled = code == .userCancel || code == .appCancel || code == .systemCancel
            finish(request, error: cancelled ? "cancelled" : (error?.localizedDescription ?? "authentication failed"))
        }
    }
}

func finish(_ request: Request.Body, error: String?) {
    var result: [String: Any] = ["id": request.id, "ok": error == nil]
    if let error { result["error"] = error }
    send(type: "result", data: result)
    sendState()
}

func handle(_ line: String) {
    guard let data = line.data(using: .utf8), let request = try? JSONDecoder().decode(Request.self, from: data),
          request.type == "request" else { return }
    switch request.data.action {
    case "permissionGrant": changePermission(request.data, grant: true)
    case "permissionRevoke": changePermission(request.data, grant: false)
    case "authenticate": authenticate(request.data)
    default: finish(request.data, error: perform(request.data))
    }
}

// MARK: старт

send(type: "hello", data: ["version": helperVersion, "pid": Int(ProcessInfo.processInfo.processIdentifier)])
sendState()

let timer = DispatchSource.makeTimerSource(queue: .main)
timer.schedule(deadline: .now() + statePeriod, repeating: statePeriod)
timer.setEventHandler { sendState() }
timer.resume()

// stdin читає окремий потік; сам запит виконується на main, як і таймер стану.
Thread.detachNewThread {
    while let line = readLine() {
        DispatchQueue.main.async { handle(line) }
    }
    // Сервер закрив канал або завершився: помічнику більше нема кому служити.
    exit(0)
}

dispatchMain()
