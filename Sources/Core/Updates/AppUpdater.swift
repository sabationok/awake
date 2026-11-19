import Sparkle

/// Обгортка над Sparkle. Оновлення качається у фоні і ставиться на вимогу користувача з кнопки.
/// Фід і публічний ключ EdDSA беруться з Info.plist (SUFeedURL, SUPublicEDKey).
@MainActor
final class AppUpdater: NSObject, SPUUpdaterDelegate {
    private let status: UpdateStatus
    private var controller: SPUStandardUpdaterController?

    init(status: UpdateStatus) {
        self.status = status
        super.init()
        controller = SPUStandardUpdaterController(startingUpdater: true, updaterDelegate: self, userDriverDelegate: nil)
    }

    /// Sparkle викликає це, коли оновлення завантажено і готове до встановлення.
    nonisolated func updater(_ updater: SPUUpdater,
                             willInstallUpdateOnQuit item: SUAppcastItem,
                             immediateInstallationBlock installationBlock: @escaping () -> Void) -> Bool {
        Task { @MainActor in
            self.status.markReady(install: installationBlock)
        }
        return true
    }
}
