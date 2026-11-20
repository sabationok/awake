import AppKit
import Foundation

/// Агент і пульт: запуск підпроцесу, стан кожні 5 секунд, журнал і події сесій, команди з пульта.
extension AwakeModel {
    /// Telegram-події за ключами налаштувань `telegram.events.<domain>.<type>`.
    private static let telegramEventKeys: [String: TelegramEvent] =
        Dictionary(uniqueKeysWithValues: TelegramEvent.allCases.map { ("telegram.events.\($0.rawValue)", $0) })

    func setUpAgent() {
        // Спершу кеш з диска: вікно одразу має всі сторінки, а агент оновить їх, коли підніметься.
        if agentEnabled {
            if case .tree(let tree) = AgentCache.load(.tree) { uiTree = tree }
            if case .devices(let devices) = AgentCache.load(.devices) { self.devices = devices }
        }
        agent.onStatus = { [weak self] status in
            self?.agentStatus = status
            // Падіння і перезапуск агента лишають кеш на місці, щоб нічого не стрибало.
            // Лише вимкнений користувачем агент прибирає сторінки: показувати їх тоді було б неправдою.
            if case .stopped = status, self?.agentEnabled == false {
                self?.uiTree = nil
                self?.devices = nil
                AgentCache.clear()
            }
        }
        agent.onCommand = { [weak self] in self?.handleAgentCommand($0) }
        agent.onTree = { [weak self] tree in
            PermissionGate.remember(tree.modules)
            // Те саме дерево не перемальовує вікно.
            if self?.uiTree != tree { self?.uiTree = tree }
        }
        agent.onSettings = { [weak self] in self?.applyAgentSettings($0) }
        agent.onDevices = { [weak self] devices in
            if self?.devices != devices { self?.devices = devices }
        }
        wifi.onAuthorizationChange = { [weak self] in self?.refreshWifi() }
        refreshWifi()
        applyAgent()
    }

    func applyAgent() {
        if agentEnabled {
            agent.start(settings: agentSettings)
            DispatchQueue.main.asyncAfter(deadline: .now() + 2) { [weak self] in self?.pushAgentState() }
        } else {
            agent.stop()
        }
    }

    func saveAgentSettings(_ settings: AgentSettings) throws {
        try AgentSettingsStore.save(settings)
        agentSettings = AgentSettingsStore.load()
        // Нові ключі Upstash агент читає лише при старті.
        agent.stop()
        DispatchQueue.main.asyncAfter(deadline: .now() + 1) { [weak self] in self?.applyAgent() }
    }

    /// Натискання в SwiftUI-рендерері йде агентові, який виконує його як дію з вебу.
    func sendUiEvent(_ event: UiEvent) {
        agent.sendEvent(event)
    }

    // MARK: Wi-Fi

    func refreshWifi() {
        wifiAuthorized = wifi.isAuthorized
        wifiDenied = wifi.isDenied
        currentSSID = wifi.currentSSID()
    }

    var currentNetworkTrusted: Bool {
        guard let currentSSID else { return false }
        return trustedNetworks.contains(currentSSID)
    }

    func setTrusted(_ ssid: String, _ trusted: Bool) {
        if trusted {
            if !trustedNetworks.contains(ssid) { trustedNetworks.append(ssid) }
        } else {
            trustedNetworks.removeAll { $0 == ssid }
        }
        pushAgentState()
    }

    // MARK: стан → агент

    func pushAgentState() {
        guard agentEnabled else { return }
        currentSSID = wifi.currentSSID()
        let state = AgentMacState(
            host: Host.current().localizedName ?? "Mac",
            active: isRunning,
            until: endDate,
            startedAt: startDate,
            duration: sessionDuration,
            battery: power.percent,
            power: power.percent == nil ? "unknown" : (power.onAC ? "AC" : "BAT"),
            thermal: Self.thermalName(thermal),
            lidClosed: ClamshellService.isClosed(),
            sleepBlocked: sleepBlocked,
            ssid: currentSSID,
            trusted: currentNetworkTrusted,
            appVersion: Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "?",
            sleepAt: sleepAt,
            volume: SoundService.volume(),
            muted: SoundService.isMuted() ?? false,
            brightness: BrightnessService.brightness()
        )
        agent.send(type: "state", data: state)
    }

    /// Кожен рядок журналу йде в SQLite агента; рядки start/restart/stop ще й як подія сесії.
    func forwardToAgent(_ entry: LogEntry) {
        guard agentEnabled else { return }
        agent.send(type: "log", data: AgentProtocol.LogLine(at: entry.date, text: entry.text))
        guard let event = SessionHistory.field("event", in: entry.text), ["start", "restart", "stop"].contains(event) else { return }
        agent.send(type: "session", data: AgentProtocol.SessionEvent(
            event: event,
            at: entry.date,
            source: sessionSource.rawValue,
            duration: SessionHistory.field("duration", in: entry.text),
            battery: SessionHistory.field("battery", in: entry.text).flatMap(Int.init),
            reason: SessionHistory.field("reason", in: entry.text)
        ))
        // Наступна дія без явного джерела — з Mac.
        if event == "stop" { sessionSource = .mac }
    }

    // MARK: налаштування від агента

    /// Знімок від агента при його старті: застосовуємо тихо, без журналу.
    /// `awake.restoreSleep` — разова дія з команди, тож у знімку її немає.
    func applyAgentSettings(_ settings: [String: UiScalar]) {
        for (key, value) in settings where key != "awake.restoreSleep" {
            applyAgentSetting(key: key, value: value)
        }
    }

    /// Одне налаштування: зі знімка або з команди. false для невідомого ключа, поганого значення або збою запису.
    @discardableResult
    func applyAgentSetting(key: String, value: UiScalar) -> Bool {
        if let event = Self.telegramEventKeys[key] {
            guard let enabled = value.boolValue else { return false }
            return setTelegramEvent(event, enabled: enabled)
        }
        switch key {
        case "awake.duration":
            guard let chosen = value.stringValue.flatMap(SessionPreset.find) else { return false }
            preset = chosen
        case "awake.displayOff":
            guard let raw = Self.number(value),
                  let option = DisplayOffOption.all.first(where: { $0.id == Int(raw) }) else { return false }
            displayOff = option
        case "awake.lockOnLidClose":
            guard let flag = value.boolValue else { return false }
            lockOnLidClose = flag
        case "awake.batteryStop":
            guard let percent = Self.percent(value) else { return false }
            SafetyLimits.batteryStop = percent
        case "system.batteryWarn", "mac.batteryWarn", "awake.batteryWarn":
            guard let percent = Self.percent(value) else { return false }
            SafetyLimits.batteryWarn = percent
        case "awake.restoreSleep":
            forceRestore()
        default:
            return false
        }
        return true
    }

    private static func number(_ value: UiScalar) -> Double? {
        if case .number(let number) = value { return number }
        return nil
    }

    /// Відсоток батареї, 0…100.
    private static func percent(_ value: UiScalar) -> Int? {
        guard let raw = number(value), (0.0...100.0).contains(raw) else { return nil }
        return Int(raw)
    }

    // MARK: команди з пульта

    private func handleAgentCommand(_ command: AgentCommand) {
        if command.action != .setting {
            let argument = command.duration ?? command.value.map(Self.settingText)
            append("Пульт: \(command.action.rawValue)\(argument.map { " \($0)" } ?? "")")
        }
        let source = command.source ?? .web
        switch command.action {
        case .start:
            let chosen = command.duration.flatMap(SessionPreset.find) ?? preset
            restart(chosen, source: source)
        case .stop:
            if isRunning { stop(source: source) }
        case .lock:
            LockService.lockAndSleepDisplay()
        case .displayOff:
            turnDisplayOff()
        case .sleepTimer:
            guard let minutes = command.value.flatMap(Self.number) else { return }
            setSleepTimer(minutes: Int(minutes))
        case .volume:
            guard let percent = command.value.flatMap(Self.percent) else { return }
            SoundService.setVolume(percent)
            pushAgentState()
        case .mute:
            guard let muted = command.value?.boolValue else { return }
            SoundService.setMuted(muted)
            pushAgentState()
        case .brightness:
            guard let percent = command.value.flatMap(Self.percent) else { return }
            BrightnessService.setBrightness(percent)
            pushAgentState()
        case .setting:
            guard let key = command.key, let value = command.value else { return }
            // Журналюємо лише зміну, яку застосували.
            if applyAgentSetting(key: key, value: value) {
                append("Налаштування \(key) = \(Self.settingText(value))")
            }
        }
    }

    private static func settingText(_ value: UiScalar) -> String {
        switch value {
        case .string(let text): text
        case .number(let number): number.rounded() == number ? String(Int(number)) : String(number)
        case .bool(let flag): String(flag)
        }
    }

    private static func thermalName(_ state: ProcessInfo.ThermalState) -> String {
        switch state {
        case .nominal: "nominal"
        case .fair: "fair"
        case .serious: "serious"
        case .critical: "critical"
        @unknown default: "nominal"
        }
    }
}
