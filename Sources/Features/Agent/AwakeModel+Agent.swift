import AppKit
import Foundation

/// Агент і пульт: запуск підпроцесу, стан кожні 5 секунд, журнал і події сесій, команди з пульта.
extension AwakeModel {
    func setUpAgent() {
        agent.onStatus = { [weak self] in self?.agentStatus = $0 }
        agent.onCommand = { [weak self] in self?.handleAgentCommand($0) }
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
            appVersion: Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "?"
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

    // MARK: команди з пульта

    private func handleAgentCommand(_ command: AgentCommand) {
        append("Пульт: \(command.action.rawValue)\(command.duration.map { " \($0)" } ?? "")")
        switch command.action {
        case .start:
            let chosen = command.duration.flatMap(SessionPreset.find) ?? preset
            restart(chosen, source: .web)
        case .stop:
            if isRunning { stop(source: .web) }
        case .lock:
            LockService.lockAndSleepDisplay()
        case .displayOff:
            turnDisplayOff()
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
