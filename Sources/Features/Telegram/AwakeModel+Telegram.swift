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
            applyTelegramListener()
            append("Налаштування Telegram збережено")
            return true
        } catch {
            append("Не вдалося зберегти: \(error.localizedDescription)")
            return false
        }
    }

    /// Перемикач події зберігається одразу. Незбережені поля токена і чату не чіпаються.
    func setTelegramEvent(_ event: TelegramEvent, enabled: Bool) {
        var updated = savedTelegram
        if enabled { updated.events.insert(event) } else { updated.events.remove(event) }
        do {
            try TelegramSettingsStore.save(updated)
            savedTelegram = updated
            telegram.events = updated.events
        } catch {
            append("Не вдалося зберегти: \(error.localizedDescription)")
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
