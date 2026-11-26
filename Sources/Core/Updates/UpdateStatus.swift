import AppKit

/// Чи чекає оновлення на встановлення. Виставляє його AppUpdater, коли Sparkle має готовий пакет.
/// Кнопка викликає `installNow()`, яка ставить оновлення і перезапускає апку.
@MainActor
final class UpdateStatus: ObservableObject {
    @Published private(set) var isReady = false
    private var install: (() -> Void)?

    func markReady(install: @escaping () -> Void) {
        self.install = install
        isReady = true
    }

    func installNow() {
        install?()
    }

    /// Модалка перед оновленням: банер і меню-бар лише кажуть, що оновлення є, а що буде далі — пояснює вона.
    /// `session` — назва активної сесії (Awake, Sleeper) або nil.
    func confirmInstall(session: String?) {
        let alert = NSAlert()
        alert.messageText = "Встановити оновлення?"
        var text = "Аппка і сервер перезапустяться. Кілька секунд бот і Web UI не відповідатимуть."
        if let session {
            // Сесію тримає сервер і зберігає в базі, тож перезапуск її не завершує.
            text = "Зараз активна сесія \(session). Вона продовжиться після перезапуску.\n\n" + text
        }
        alert.informativeText = text
        alert.addButton(withTitle: "Оновити й перезапустити")
        alert.addButton(withTitle: "Пізніше")
        NSApp.activate(ignoringOtherApps: true)
        if alert.runModal() == .alertFirstButtonReturn { installNow() }
    }
}
