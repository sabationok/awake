import AppKit
import Foundation

/// Сервер: аппка підключається до нього як клієнт, отримує знімки (дерево, стан, пристрої…) і шле натискання.
extension AwakeModel {
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
        agent.onState = { [weak self] in self?.applyServerState($0) }
        // Назву Wi-Fi знає лише аппка (дозвіл геолокації): сервер отримує її одразу після підключення.
        agent.onConnected = { [weak self] in
            self?.sendWifi()
            self?.sendPermissions()
        }
        agent.onTree = { [weak self] tree in
            PermissionGate.remember(tree.modules)
            // Те саме дерево не перемальовує вікно.
            if self?.uiTree != tree { self?.uiTree = tree }
            if self?.treeIsFresh == false { self?.treeIsFresh = true }
        }
        agent.onSettings = { [weak self] in self?.applyAgentSettings($0) }
        agent.onDevices = { [weak self] devices in
            if self?.devices != devices { self?.devices = devices }
        }
        agent.onTrustedNetworks = { [weak self] ssids in
            self?.importLegacyTrustedNetworks(known: ssids)
            if self?.trustedNetworks != ssids { self?.trustedNetworks = ssids }
        }
        agent.onServerInfo = { [weak self] info in
            if self?.serverInfo != info { self?.serverInfo = info }
        }
        agent.onServerCharts = { [weak self] charts in self?.serverCharts = charts }
        agent.onServerChartsTick = { [weak self] tick in self?.serverCharts?.apply(tick) }
        // Поточний бакет графіків сторінок статистики: дерево не перешивається, лише ці точки.
        agent.onChartTick = { [weak self] tick in self?.uiTree?.apply(tick) }
        agent.onWebhooks = { [weak self] webhooks in
            if self?.webhooks != webhooks { self?.webhooks = webhooks }
        }
        agent.onSecrets = { [weak self] secrets in
            if self?.secrets != secrets { self?.secrets = secrets }
        }
        wifi.onAuthorizationChange = { [weak self] in self?.refreshWifi() }
        refreshWifi()
        setupProximity()
        applyAgent()
    }

    func applyAgent() {
        if agentEnabled {
            agent.start(settings: agentSettings)
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

    /// «Перезапустити» на сторінці «Сервер»: той самий шлях, що й після зміни налаштувань.
    func restartAgent() {
        agent.stop()
        serverInfo = nil
        DispatchQueue.main.asyncAfter(deadline: .now() + 1) { [weak self] in self?.applyAgent() }
    }

    /// «Сервер» відкрився, змінився період або перезапустився агент: агент шле графіки й далі тіки цього періоду.
    func requestServerCharts(_ period: StatsPeriod) {
        struct Request: Encodable { let period: StatsPeriod }
        agent.send(type: "serverCharts", data: Request(period: period))
    }

    /// Натискання в SwiftUI-рендерері йде агентові, який виконує його як дію з вебу.
    func sendUiEvent(_ event: UiEvent) {
        agent.sendEvent(event)
    }

    // MARK: Wi-Fi

    func refreshWifi() {
        wifiAuthorized = wifi.isAuthorized
        wifiDenied = wifi.isDenied
        let ssid = wifi.currentSSID()
        guard ssid != currentSSID else { return }
        currentSSID = ssid
        // Сервер вирішує, чи мережа довірена, лише за цією назвою.
        sendWifi()
    }

    /// Тимчасово: помічник сервера ще не має дозволу геолокації, тож назву Wi-Fi серверу дає аппка.
    func sendWifi() {
        struct Wifi: Encodable { let ssid: String? }
        agent.send(type: "wifi", data: Wifi(ssid: currentSSID))
    }

    var currentNetworkTrusted: Bool {
        guard let currentSSID else { return false }
        return trustedNetworks.contains(currentSSID)
    }

    /// Список зберігає агент: аппка шле зміну, а новий список приходить у `trustedNetworks`.
    func setTrusted(_ ssid: String, _ trusted: Bool) {
        struct Change: Encodable { let action: String; let ssid: String }
        agent.send(type: "trustedNetworks", data: Change(action: trusted ? "add" : "remove", ssid: ssid))
        // Одразу в UI, щоб перемикач не відскакував до відповіді агента.
        if trusted {
            if !trustedNetworks.contains(ssid) { trustedNetworks.append(ssid) }
        } else {
            trustedNetworks.removeAll { $0 == ssid }
        }
    }

    /// Мережі з UserDefaults (до переїзду в SQLite) один раз переходять в агента, потім ключ стирається.
    private func importLegacyTrustedNetworks(known: [String]) {
        let legacy = LegacyTrustedNetworks.saved
        guard !legacy.isEmpty else { return }
        for ssid in legacy where !known.contains(ssid) { setTrusted(ssid, true) }
        LegacyTrustedNetworks.clear()
        append("Довірені мережі перенесено в базу агента: \(legacy.count)")
    }

    /// Дозволи з «Дозволів»: що видано в системі і що вимкнено окремим модулям. Перевіряє їх сервер.
    func sendPermissions() {
        struct Denied: Encodable { let module: String; let permission: String }
        struct Snapshot: Encodable { let granted: [String]; let denied: [Denied] }
        let denied = PermissionGate.declarations.keys.sorted().flatMap { module in
            AppPermission.allCases
                .filter { !PermissionGate.moduleAllowed($0, module: module) }
                .map { Denied(module: module, permission: $0.rawValue) }
        }
        agent.send(type: "permissions", data: Snapshot(granted: grantedPermissions.map(\.rawValue).sorted(), denied: denied))
    }

    // MARK: стан від сервера

    /// Сесії веде сервер: аппка лише показує їх у меню-барі.
    func applyServerState(_ state: ServerMacState) {
        if serverState != state { serverState = state }
    }

    /// Рядок журналу аппки (збережено ключі, видано дозвіл) іде в журнал сервера.
    func forwardToAgent(_ entry: LogEntry) {
        guard agentEnabled else { return }
        agent.send(type: "log", data: AgentProtocol.LogLine(at: entry.date, text: entry.text))
    }

    // MARK: налаштування від сервера

    /// Знімок налаштувань: аппці потрібні лише ключі «Поруч», бо Bluetooth поки сканує вона.
    func applyAgentSettings(_ settings: [String: UiScalar]) {
        for (key, value) in settings where key.hasPrefix("proximity.") {
            _ = applyProximitySetting(key: key, value: value)
        }
    }

    // MARK: дії меню-бара

    /// Ті самі дії, що й кнопки на сторінках: виконує їх сервер.
    func sendAction(_ module: String, _ name: String, _ params: [String: UiScalar]? = nil) {
        sendUiEvent(.action(UiAction(module: module, name: name, params: params)))
    }
}
