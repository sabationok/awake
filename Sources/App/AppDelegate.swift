import AppKit

final class AppDelegate: NSObject, NSApplicationDelegate {
    /// Готовність оновлення для банера у вікні і пункту в меню-барі.
    let updates = MainActor.assumeIsolated { UpdateStatus() }
    private var updater: AppUpdater?

    func applicationDidFinishLaunching(_ notification: Notification) {
        // Запис у pipe агента, що щойно впав, інакше вбив би аппку сигналом SIGPIPE.
        signal(SIGPIPE, SIG_IGN)
        MainActor.assumeIsolated {
            DockVisibility.startObserving()
            updater = AppUpdater(status: updates)
        }
    }

    /// Після закриття вікна аппка лишається в меню-барі.
    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool { false }

    /// Вихід з аппки завершує сесію, щоб сон не лишився заблокованим.
    func applicationWillTerminate(_ notification: Notification) {
        MainActor.assumeIsolated {
            AwakeModel.shared.agent.stop()
            AwakeModel.shared.stopAndWait()
        }
    }
}
