import Foundation

/// Примусовий сон Mac. `pmset sleepnow` не зважає на те, що плеєр не дає заснути від бездіяльності,
/// але не працює, поки сон вимкнено (`disablesleep 1`): тому таймер спершу завершує сесію.
enum SleepService {
    static func sleepNow() {
        _ = Shell.run("/usr/bin/pmset", ["sleepnow"])
    }
}

/// Таймер сну: «заснути через N хвилин». Рахує Mac-аппка, агент лише показує `sleepAt`.
extension AwakeModel {
    /// 0 скасовує таймер, інше число ставить його з нуля.
    func setSleepTimer(minutes: Int) {
        if minutes <= 0 {
            guard sleepAt != nil else { return }
            sleepAt = nil
            append("Таймер сну скасовано")
        } else {
            let at = Date().addingTimeInterval(TimeInterval(minutes * 60))
            sleepAt = at
            append("Таймер сну: засне о \(at.formatted(date: .omitted, time: .shortened))")
        }
        pushAgentState()
    }

    /// Щосекунди з тікера. Сесію спершу зупиняємо: сон повернеться, і тоді `sessionEnded` присипить Mac.
    func checkSleepTimer() {
        guard let sleepAt, Date() >= sleepAt else { return }
        self.sleepAt = nil
        append("Таймер сну: засинаю")
        if isRunning {
            sleepAfterStop = true
            stop(source: .mac)
        } else {
            // Сон лишився вимкненим після збою: повернути, інакше sleepnow нічого не зробить.
            if sleepBlocked { forceRestore() }
            sleepSoon()
        }
    }

    /// Секунда на те, щоб журнал і стан дійшли до агента та Telegram, перш ніж Mac засне.
    func sleepSoon() {
        pushAgentState()
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) { SleepService.sleepNow() }
    }
}
