// Помічник MaControl: маленький процес на чистому Swift (без SwiftUI і AppKit), єдиний, хто звертається до macOS.
// Його запускає сервер (NestJS). Протокол — JSON-рядки: запити зі stdin, стан і відповіді в stdout
// (contracts/src/helper.ts). Помічник нічого не вирішує: виконує примітив і звітує стан.
// Системні сервіси спільні з аппкою (Sources/**), список файлів у scripts/build-helper.sh.
import CoreWLAN
import Foundation

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

func sendState() {
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
    ])
}

// MARK: запити

struct Request: Decodable {
    struct Body: Decodable {
        let id: String
        let action: String
        let value: Value?
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

func handle(_ line: String) {
    guard let data = line.data(using: .utf8), let request = try? JSONDecoder().decode(Request.self, from: data),
          request.type == "request" else { return }
    let error = perform(request.data)
    var result: [String: Any] = ["id": request.data.id, "ok": error == nil]
    if let error { result["error"] = error }
    send(type: "result", data: result)
    sendState()
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
