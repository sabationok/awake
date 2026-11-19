import SwiftUI

struct MenuBarContent: View {
    @EnvironmentObject private var model: AwakeModel
    @EnvironmentObject private var updates: UpdateStatus
    @Environment(\.openWindow) private var openWindow

    var body: some View {
        status
        Divider()
        sessionActions
        Divider()
        Button("Погасити екран") { model.turnDisplayOff() }
        Button("Відкрити вікно…") {
            DockVisibility.show()
            openWindow(id: WindowID.main)
        }
        if updates.isReady {
            Divider()
            // Встановлення перезапускає аппку, тому активна сесія завершиться.
            Button("Перезавантажити для оновлення") { updates.installNow() }
        }
        Button("Вийти") { NSApp.terminate(nil) }
            .keyboardShortcut("q")
    }

    @ViewBuilder private var status: some View {
        if let remaining = model.remaining {
            Text("Не сплю ще \(remaining)")
        } else {
            Text(model.sleepBlocked ? "Сон заблоковано" : "Сон працює нормально")
        }
        Text("Батарея \(model.power.summary)")
        Text("Температура: \(model.thermal.title.lowercased())")
    }

    @ViewBuilder private var sessionActions: some View {
        if model.isRunning {
            Button("Зупинити") { model.stop() }
        } else {
            ForEach(SessionPreset.all) { preset in
                Button("Не спати \(preset.title)") { model.start(preset) }
            }
            .disabled(!model.permissionGranted)
            if model.sleepBlocked {
                Button("Повернути сон") { model.forceRestore() }
            }
        }
    }
}
