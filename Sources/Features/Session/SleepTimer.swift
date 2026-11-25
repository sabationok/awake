import Foundation

/// Примусовий сон Mac. `pmset sleepnow` не зважає на те, що плеєр не дає заснути від бездіяльності,
/// але не працює, поки сон вимкнено (`disablesleep 1`).
enum SleepService {
    static func sleepNow() {
        _ = Shell.run("/usr/bin/pmset", ["sleepnow"])
    }
}

/// Сесія таймера сну, збережена між запусками аппки: інакше перезапуск тихо губить таймер.
struct SleepTimerSession: Codable, Equatable {
    var startedAt: Date
    var sleepAt: Date
    var minutes: Int

    private static let key = "sleepTimer.session"

    static var saved: SleepTimerSession? {
        get { UserDefaults.standard.data(forKey: key).flatMap { try? JSONDecoder().decode(Self.self, from: $0) } }
        set { UserDefaults.standard.set(newValue.flatMap { try? JSONEncoder().encode($0) }, forKey: key) }
    }
}

/// Sleeper — окрема сесія, як Awake: свій відлік, свої сповіщення, своя історія.
/// Події йдуть в агент: він пише історію і шле Telegram (`silent` — без повідомлення).
/// Одночасно працює лише одна з двох: нова закриває попередню з причиною в журналі.
extension AwakeModel {
    /// Нова сесія таймера з нуля. Сесія Awake тримає сон вимкненим, тож її спершу закриваємо.
    func startSleepTimer(minutes: Int, source: SessionSource = .mac) {
        guard minutes > 0 else { stopSleepTimer(reason: "скасовано", source: source); return }
        if sleepTimer != nil { endSleepTimer(reason: "перезапуск", source: source, silent: true) }
        if isRunning { stop(source: source, reason: "Sleeper") }
        let now = Date()
        let session = SleepTimerSession(startedAt: now, sleepAt: now.addingTimeInterval(TimeInterval(minutes * 60)), minutes: minutes)
        sleepTimer = session
        let until = session.sleepAt.formatted(date: .omitted, time: .shortened)
        let fields = ["event=sleep.start", "until=\(until)", "minutes=\(minutes)"]
        append("🌙 Sleeper: засне о \(until) (\(fields.joined(separator: " ")))")
        sendSleepTimerEvent(event: "start", at: now, session: session, source: source, reason: nil, silent: false)
        pushAgentState()
    }

    func stopSleepTimer(reason: String, source: SessionSource = .mac) {
        guard sleepTimer != nil else { return }
        endSleepTimer(reason: reason, source: source, silent: false)
        pushAgentState()
    }

    /// Щосекунди з тікера: час вийшов — закриваємо сесію і присипляємо Mac.
    func checkSleepTimer() {
        guard let session = sleepTimer, Date() >= session.sleepAt else { return }
        endSleepTimer(reason: "Mac заснув", source: .mac, silent: false)
        // Сон лишився вимкненим після збою: повернути, інакше sleepnow нічого не зробить.
        if sleepBlocked && !isRunning { forceRestore() }
        sleepSoon()
    }

    /// Таймер, що лишився з попереднього запуску: ще не вийшов — іде далі, вийшов — закриваємо без сну,
    /// бо присипляти Mac одразу після запуску аппки несподівано.
    func restoreSleepTimer() {
        guard let session = sleepTimer, Date() >= session.sleepAt else { return }
        endSleepTimer(reason: "перервано", source: .mac, silent: true)
    }

    /// Секунда на те, щоб журнал, стан і подія дійшли до агента (а від нього в Telegram), перш ніж Mac засне.
    func sleepSoon() {
        pushAgentState()
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) { SleepService.sleepNow() }
    }

    private func endSleepTimer(reason: String, source: SessionSource, silent: Bool) {
        guard let session = sleepTimer else { return }
        sleepTimer = nil
        let fields = ["event=sleep.stop", "reason=\(reason)", "minutes=\(session.minutes)"]
        let title = reason == "Mac заснув" ? "💤 Sleeper: засинаю" : "🌙 Sleeper завершено"
        append("\(title) (\(fields.joined(separator: " ")))")
        sendSleepTimerEvent(event: "stop", at: Date(), session: session, source: source, reason: reason, silent: silent)
    }

    private func sendSleepTimerEvent(event: String, at: Date, session: SleepTimerSession, source: SessionSource, reason: String?, silent: Bool) {
        guard agentEnabled else { return }
        agent.send(type: "sleepTimer", data: AgentProtocol.SleepTimerEvent(
            event: event, at: at, startedAt: session.startedAt, sleepAt: session.sleepAt,
            minutes: session.minutes, source: source.rawValue, reason: reason, silent: silent
        ))
    }
}
