import SwiftUI

@main
struct AwakeApp: App {
    @NSApplicationDelegateAdaptor(AppDelegate.self) private var delegate
    @StateObject private var model = AwakeModel.shared

    var body: some Scene {
        Window("Awake", id: WindowID.main) {
            MainView().environmentObject(model).environmentObject(delegate.updates)
        }
        .windowResizability(.contentMinSize)
        .defaultSize(width: 720, height: 520)
        // Назва сторінки — у заголовку вікна поруч із його кнопками, а не на самій сторінці.
        .windowToolbarStyle(.unified)

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
