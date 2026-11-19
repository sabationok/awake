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

    // MARK: стан системи
    @Published private(set) var power = PowerStatus.unknown
    @Published private(set) var thermal = ProcessInfo.processInfo.thermalState
    @Published private(set) var sleepBlocked = false
    @Published private(set) var permissionGranted = false

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
    /// Приймати команди від бота. Зберігається між запусками.
    @Published var telegramCommands = UserDefaults.standard.bool(forKey: "telegram.commands") {
        didSet {
            UserDefaults.standard.set(telegramCommands, forKey: "telegram.commands")
            applyTelegramListener()
        }
    }
    @Published var telegramListener = TelegramCommandListener.Status.stopped
    let commandListener = TelegramCommandListener()

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
        applyTelegramListener()
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
        permissionGranted = PermissionService.isGranted()
    }

    private func tick() {
        now = Date()
        tickCount += 1
        if tickCount % 15 == 0 { refresh() }
        if isRunning { dimmer.update(limit: displayOff.seconds) }
        if tickCount % 2 == 0 { watchLid() }
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

    func start(_ preset: SessionPreset? = nil) {
        start(preset, previousSeconds: nil)
    }

    private func start(_ preset: SessionPreset?, previousSeconds: Int?) {
        guard PermissionGate.isUsable(.sleepControl, by: .awake, appGranted: permissionGranted) else {
            append("Керування сном вимкнено для модуля Awake або не видано дозвіл")
            return
        }
        guard !isRunning else { return }
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
            endDate = Date().addingTimeInterval(TimeInterval(chosen.seconds))
            DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) { [weak self] in self?.refresh() }
        } catch {
            append("Не вдалося запустити скрипт: \(error.localizedDescription)")
        }
    }

    func stop() {
        pendingRestart = nil
        runner.stop()
    }

    /// Нова сесія з новим часом. Якщо сесія вже працює, зупиняє її і стартує знову,
    /// щойно скрипт завершиться: таймер рахується з нуля, а не додається до решти.
    func restart(_ preset: SessionPreset? = nil) {
        let chosen = preset ?? self.preset
        guard isRunning else { start(chosen); return }
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
        refresh()
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
        if let first = log.first, Date().timeIntervalSince(first.date) > LogStore.retention {
            log = LogStore.prune(log)
            LogStore.rewrite(log)
        }
    }
}
