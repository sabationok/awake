import AppKit

final class AppDelegate: NSObject, NSApplicationDelegate {
    /// Готовність оновлення для банера у вікні і пункту в меню-барі.
    let updates = MainActor.assumeIsolated { UpdateStatus() }
    private var updater: AppUpdater?

    func applicationDidFinishLaunching(_ notification: Notification) {
        // Запис у сокет сервера, що щойно зупинився, інакше вбив би аппку сигналом SIGPIPE.
        signal(SIGPIPE, SIG_IGN)
        MainActor.assumeIsolated {
            DockVisibility.startObserving()
            updater = AppUpdater(status: updates)
        }
    }

    /// Після закриття вікна аппка лишається в меню-барі.
    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool { false }

    /// Вихід з аппки лише закриває з'єднання: сервер і сесії працюють далі, бот і Web UI лишаються доступними.
    func applicationWillTerminate(_ notification: Notification) {
        MainActor.assumeIsolated {
            AwakeModel.shared.agent.disconnect()
        }
    }
}
