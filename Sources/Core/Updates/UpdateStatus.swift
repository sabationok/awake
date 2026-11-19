import Foundation

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
}
