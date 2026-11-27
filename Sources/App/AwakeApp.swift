import SwiftUI

@main
struct AwakeApp: App {
    @NSApplicationDelegateAdaptor(AppDelegate.self) private var delegate
    @StateObject private var model = AwakeModel.shared

    init() {
        // До першого читання UserDefaults: AwakeModel створюється ліниво, вже після цього.
        LegacyDefaults.migrate()
    }

    var body: some Scene {
        Window("MaControl", id: WindowID.main) {
            MainView().environmentObject(model).environmentObject(delegate.updates)
        }
        .windowResizability(.contentMinSize)
        .defaultSize(width: 720, height: 520)
        // Заголовок вікна прозорий і без тексту (AppHeader → WindowChrome): його місце займає власний хедер.

        MenuBarExtra {
            MenuBarContent().environmentObject(model).environmentObject(delegate.updates)
        } label: {
            MenuBarLabel().environmentObject(model)
        }
    }
}

enum WindowID {
    static let main = "main"
}
