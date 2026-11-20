import Foundation

extension AwakeModel {
    var telegramDirty: Bool { telegram != savedTelegram }

    @discardableResult
    func saveTelegram() -> Bool {
        do {
            try TelegramSettingsStore.save(telegram)
            savedTelegram = telegram
            telegramEditing = false
            flashTelegramSaved()
            append("Налаштування Telegram збережено")
            return true
        } catch {
            append("Не вдалося зберегти: \(error.localizedDescription)")
            return false
        }
    }

    /// Вмикає або вимикає подію в telegram.env. Незбережені поля токена і чату не чіпаються.
    /// Без змін файл не переписується: агент шле повний знімок налаштувань при кожному запуску.
    @discardableResult
    func setTelegramEvent(_ event: TelegramEvent, enabled: Bool) -> Bool {
        var updated = savedTelegram
        if enabled { updated.events.insert(event) } else { updated.events.remove(event) }
        guard updated.events != savedTelegram.events else { return true }
        do {
            try TelegramSettingsStore.save(updated)
            savedTelegram = updated
            telegram.events = updated.events
            return true
        } catch {
            append("Не вдалося зберегти: \(error.localizedDescription)")
            return false
        }
    }

    /// Відкидає незбережені правки і згортає поля, якщо є збережені налаштування.
    func cancelTelegramEditing() {
        telegram = savedTelegram
        telegramEditing = !savedTelegram.isConfigured
    }

    func testTelegram() {
        if telegramDirty { guard saveTelegram() else { return } }
        Task.detached {
            let lines = AwakeScript.run("test").lines
            await MainActor.run { lines.forEach { AwakeModel.shared.append($0) } }
        }
    }

    private func flashTelegramSaved() {
        telegramJustSaved = true
        DispatchQueue.main.asyncAfter(deadline: .now() + 2) { [weak self] in
            self?.telegramJustSaved = false
        }
    }
}
