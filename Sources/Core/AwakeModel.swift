import Foundation

/// Стан аппки-клієнта. Сесії, журнал і системні дії належать серверу: тут лише дзеркало його стану
/// для меню-бара, знімки для сторінок і те, що є тільки в аппці (дозволи macOS, ключі, Wi-Fi, Bluetooth).
@MainActor
final class AwakeModel: ObservableObject {
    static let shared = AwakeModel()

    // MARK: стан від сервера
    /// Останній стан Mac і сесій від сервера; nil, поки сервер його не надіслав або з'єднання немає.
    @Published var serverState: ServerMacState?
    @Published private(set) var now = Date()
    @Published private(set) var grantedPermissions: Set<AppPermission> = []

    @Published var telegram = TelegramSettingsStore.load()
    /// Те, що лежить у файлі. Розбіжність із `telegram` означає незбережені зміни.
    @Published var savedTelegram = TelegramSettingsStore.load()
    /// Поля відкриті для редагування. Початково лише коли налаштувань ще немає.
    @Published var telegramEditing = !TelegramSettingsStore.load().isConfigured
    /// Коротке «Збережено» після успішного запису.
    @Published var telegramJustSaved = false

    // MARK: Web UI (агент)
    /// Дерево UI від агента. nil, поки агента немає або він зупинений.
    @Published var uiTree: UiTree?
    /// У цьому запуску сервер уже надіслав дерево: до того вікно показує кеш під заставкою.
    @Published var treeIsFresh = false
    /// Сполучені пристрої і посилання сполучення. nil, поки агент їх не надіслав.
    @Published var devices: AgentDevices?
    /// Стан Envify і звідки агент узяв кожен ключ. nil, поки агент його не надіслав.
    @Published var secrets: AgentSecrets?
    /// Вебхуки webhooxy з SQLite агента, зі станом і лічильниками. Порожньо, поки агент їх не надіслав.
    @Published var webhooks: [AgentWebhook] = []
    /// Інстанс сервера агента (pid, порти, звідки Web UI). nil, поки агент його не надіслав.
    @Published var serverInfo: AgentServerInfo?
    /// Графіки «Сервера» за вибраний період; live-тіки агента дописують у них поточний бакет.
    @Published var serverCharts: AgentServerCharts?
    @Published var agentEnabled = UserDefaults.standard.object(forKey: "agent.enabled") as? Bool ?? true {
        didSet {
            UserDefaults.standard.set(agentEnabled, forKey: "agent.enabled")
            applyAgent()
        }
    }
    @Published var agentStatus = AgentService.Status.stopped
    @Published var agentSettings = AgentSettingsStore.load()
    /// Довірені мережі Wi-Fi з SQLite агента. Порожньо, поки агент їх не надіслав.
    @Published var trustedNetworks: [String] = []
    @Published var currentSSID: String?
    @Published var wifiAuthorized = false
    @Published var wifiDenied = false
    @Published var bluetoothAuthorized = false
    @Published var bluetoothDenied = false
    let agent = AgentService()
    let wifi = WifiService()
    let bluetooth = BluetoothScanner()
    // MARK: журнал
    @Published private(set) var log = LogStore.load()

    private var ticker: Timer?
    private var tickCount = 0

    private init() {
        refresh()
        setUpAgent()
        ticker = Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { _ in
            Task { @MainActor in AwakeModel.shared.tick() }
        }
    }

    // MARK: що показує меню-бар

    /// Стан сервера, лише поки з'єднання живе: застарілий відлік показувати не можна.
    private var liveState: ServerMacState? { agentStatus.isRunning ? serverState : nil }
    var serverOnline: Bool { liveState != nil }
    var isRunning: Bool { liveState?.active ?? false }
    var sleepBlocked: Bool { liveState?.sleepBlocked ?? false }

    /// Зворотний відлік до кінця сесії.
    var remaining: String? {
        guard isRunning, let endDate = liveState?.until else { return nil }
        return Countdown.string(until: endDate, now: now)
    }

    var power: PowerStatus {
        guard let state = liveState else { return .unknown }
        return PowerStatus(percent: state.battery, onAC: state.power != "BAT")
    }

    var thermal: ProcessInfo.ThermalState {
        switch liveState?.thermal {
        case "fair": .fair
        case "serious": .serious
        case "critical": .critical
        default: .nominal
        }
    }

    // MARK: оновлення стану

    func refresh() {
        grantedPermissions = PermissionService.granted()
    }

    private func tick() {
        now = Date()
        tickCount += 1
        if tickCount % 15 == 0 { refresh() }
        if tickCount % 5 == 0 { refreshWifi() }
    }

    // MARK: журнал

    /// Дописує рядок у журнал і файл. Префікс «[HH:MM] » зі скрипта прибирається,
    /// бо час зберігається окремо.
    func append(_ line: String) {
        let text = line.replacingOccurrences(of: #"^\[\d\d:\d\d\] "#, with: "", options: .regularExpression)
        let entry = LogEntry(date: Date(), text: text)
        log.append(entry)
        LogStore.append(entry)
        forwardToAgent(entry)
        if let first = log.first, Date().timeIntervalSince(first.date) > LogStore.retention {
            log = LogStore.prune(log)
            LogStore.rewrite(log)
        }
    }
}
