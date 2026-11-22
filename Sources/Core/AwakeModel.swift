import Foundation

/// Стан аппки і дії над сесією. Розмітка лише читає цей стан і викликає дії,
/// а системні команди виконують сервіси.
@MainActor
final class AwakeModel: ObservableObject {
    static let shared = AwakeModel()

    // MARK: сесія
    /// Тривалість за замовчуванням: для перемикача у вікні і для /start без аргументу.
    @Published var preset = SessionPreset.saved {
        didSet { SessionPreset.saved = preset }
    }
    @Published private(set) var isRunning = false
    @Published private(set) var startDate: Date?
    @Published private(set) var endDate: Date?
    @Published private(set) var now = Date()
    /// Сесія таймера сну. Змінюють лише методи в SleepTimer.swift.
    @Published var sleepTimer = SleepTimerSession.saved {
        didSet { SleepTimerSession.saved = sleepTimer }
    }

    // MARK: стан системи
    @Published private(set) var power = PowerStatus.unknown
    @Published private(set) var thermal = ProcessInfo.processInfo.thermalState
    @Published private(set) var sleepBlocked = false
    @Published private(set) var grantedPermissions: Set<AppPermission> = []

    // MARK: налаштування
    @Published var displayOff = DisplayOffOption.saved {
        didSet { DisplayOffOption.saved = displayOff }
    }
    /// Блокувати екран, коли кришку закрили під час сесії: сон вимкнено, тож система цього не зробить.
    @Published var lockOnLidClose = UserDefaults.standard.object(forKey: "lockOnLidClose") as? Bool ?? true {
        didSet { UserDefaults.standard.set(lockOnLidClose, forKey: "lockOnLidClose") }
    }
    private var lidClosed = ClamshellService.isClosed()
    @Published var telegram = TelegramSettingsStore.load()
    /// Те, що лежить у файлі. Розбіжність із `telegram` означає незбережені зміни.
    @Published var savedTelegram = TelegramSettingsStore.load()
    /// Поля відкриті для редагування. Початково лише коли налаштувань ще немає.
    @Published var telegramEditing = !TelegramSettingsStore.load().isConfigured
    /// Коротке «Збережено» після успішного запису.
    @Published var telegramJustSaved = false

    // MARK: пульт (агент)
    /// Дерево UI від агента. nil, поки агента немає або він зупинений.
    @Published var uiTree: UiTree?
    /// Сполучені пристрої і посилання сполучення. nil, поки агент їх не надіслав.
    @Published var devices: AgentDevices?
    /// Стан Envify і звідки агент узяв кожен ключ. nil, поки агент його не надіслав.
    @Published var secrets: AgentSecrets?
    /// Вебхуки webhooxy з SQLite агента, зі станом і лічильниками. Порожньо, поки агент їх не надіслав.
    @Published var webhooks: [AgentWebhook] = []
    /// Інстанс сервера агента (pid, порти, звідки пульт). nil, поки агент його не надіслав.
    @Published var serverInfo: AgentServerInfo?
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
    /// Хто почав або зупинив поточну сесію: потрапляє в історію агента.
    var sessionSource = SessionSource.mac
    /// Тривалість поточної сесії, як її передали скрипту: 2h, 30m.
    private(set) var sessionDuration: String?

    // MARK: журнал
    @Published private(set) var log = LogStore.load()

    private let runner = SessionRunner()
    /// Тривалість, з якою треба запустити нову сесію, щойно поточна завершиться (рестарт).
    private var pendingRestart: (preset: SessionPreset, previousSeconds: Int)?
    private var dimmer = IdleDisplayDimmer()
    private var ticker: Timer?
    private var tickCount = 0

    private init() {
        refresh()
        restoreAfterCrash()
        setUpAgent()
        restoreSleepTimer()
        ticker = Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { _ in
            Task { @MainActor in AwakeModel.shared.tick() }
        }
        NotificationCenter.default.addObserver(
            forName: ProcessInfo.thermalStateDidChangeNotification, object: nil, queue: .main
        ) { _ in
            Task { @MainActor in AwakeModel.shared.thermal = ProcessInfo.processInfo.thermalState }
        }
    }

    /// Зворотний відлік до кінця сесії.
    var remaining: String? {
        guard isRunning, let endDate else { return nil }
        return Countdown.string(until: endDate, now: now)
    }

    /// Сон заблокований, але не нашою сесією, наприклад після аварійного виходу.
    var sleepBlockedOutside: Bool { sleepBlocked && !isRunning }

    // MARK: оновлення стану

    func refresh() {
        power = PowerService.battery()
        thermal = ProcessInfo.processInfo.thermalState
        sleepBlocked = PowerService.isSleepBlocked()
        grantedPermissions = PermissionService.granted()
    }

    private func tick() {
        now = Date()
        tickCount += 1
        checkSleepTimer()
        if tickCount % 15 == 0 { refresh() }
        if isRunning { dimmer.update(limit: displayOff.seconds) }
        if tickCount % 2 == 0 { watchLid() }
        if tickCount % 5 == 0 { pushAgentState() }
    }

    /// Перехід кришки у «закрито» під час сесії блокує екран, бо Mac не засне і сам не заблокується.
    private func watchLid() {
        let closed = ClamshellService.isClosed()
        defer { lidClosed = closed }
        guard closed, !lidClosed, isRunning, lockOnLidClose else { return }
        let locked = LockService.lockAndSleepDisplay()
        append(locked ? "Кришку закрито: екран заблоковано" : "Кришку закрито: екран погашено, блокування недоступне")
    }

    // MARK: дії сесії

    func start(_ preset: SessionPreset? = nil, source: SessionSource = .mac) {
        sessionSource = source
        start(preset, previousSeconds: nil)
    }

    private func start(_ preset: SessionPreset?, previousSeconds: Int?) {
        guard PermissionGate.isUsable(.sleepControl, by: "awake", appGranted: isGranted(.sleepControl)) else {
            append("Керування сном вимкнено для модуля Awake або не видано дозвіл")
            return
        }
        guard !isRunning else { return }
        // Одна сесія за раз: Awake закриває таймер сну.
        stopSleepTimer(reason: "сесія Awake", source: sessionSource)
        // Явна тривалість (меню-бар, /start 2h) діє лише на цю сесію.
        let chosen = preset ?? self.preset
        do {
            try runner.start(
                duration: chosen.id,
                previousSeconds: previousSeconds,
                onLine: { [weak self] in self?.append($0) },
                onExit: { [weak self] in self?.sessionEnded() }
            )
            isRunning = true
            startDate = Date()
            sessionDuration = chosen.id
            endDate = Date().addingTimeInterval(TimeInterval(chosen.seconds))
            pushAgentState()
            DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) { [weak self] in self?.refresh() }
        } catch {
            append("Не вдалося запустити скрипт: \(error.localizedDescription)")
        }
    }

    /// `reason` потрапляє в журнал і Telegram замість «зупинено вручну».
    func stop(source: SessionSource = .mac, reason: String? = nil) {
        sessionSource = source
        pendingRestart = nil
        runner.stop(reason: reason)
    }

    /// Нова сесія з новим часом. Якщо сесія вже працює, зупиняє її і стартує знову,
    /// щойно скрипт завершиться: таймер рахується з нуля, а не додається до решти.
    func restart(_ preset: SessionPreset? = nil, source: SessionSource = .mac) {
        let chosen = preset ?? self.preset
        guard isRunning else { start(chosen, source: source); return }
        sessionSource = source
        let elapsed = Int(Date().timeIntervalSince(startDate ?? Date()))
        pendingRestart = (chosen, elapsed)
        runner.stopForRestart()
    }

    func stopAndWait() {
        runner.stopAndWait()
    }

    /// Аварійне повернення сну, коли скрипт не працює, а сон лишився заблокованим.
    func forceRestore() {
        AwakeScript.run("off").lines.forEach(append)
        refresh()
    }

    /// Сон вимкнено, а жодна сесія не працює: лишилось після збою, вимкнення
    /// або розряду батареї. Повертаємо сон одразу при старті аппки.
    private func restoreAfterCrash() {
        guard sleepBlocked, !AwakeScript.sessionAlive else { return }
        AwakeScript.run("off", "після збою: сон лишився вимкненим без активної сесії").lines.forEach(append)
        refresh()
    }

    func turnDisplayOff() {
        DisplayService.sleepNow()
    }

    private func sessionEnded() {
        isRunning = false
        startDate = nil
        endDate = nil
        sessionDuration = nil
        refresh()
        pushAgentState()
        if let next = pendingRestart {
            pendingRestart = nil
            start(next.preset, previousSeconds: next.previousSeconds)
        }
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
