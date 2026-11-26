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
        Button("Погасити екран") { model.sendAction("awake", "displayOff") }
            .disabled(!model.serverOnline)
        Button("Відкрити вікно…") {
            DockVisibility.show()
            openWindow(id: WindowID.main)
        }
        if updates.isReady {
            Divider()
            // Встановлення перезапускає аппку; сесію тримає сервер, тож вона не завершується.
            Button("Перезавантажити для оновлення") { updates.installNow() }
        }
        Button("Вийти") { NSApp.terminate(nil) }
            .keyboardShortcut("q")
    }

    @ViewBuilder private var status: some View {
        if !model.serverOnline {
            Text("Сервер недоступний")
        } else if let remaining = model.remaining {
            Text("Не сплю ще \(remaining)")
        } else {
            Text(model.sleepBlocked ? "Сон заблоковано" : "Сон працює нормально")
        }
        Text("Батарея \(model.power.summary)")
        Text("Температура: \(model.thermal.title.lowercased())")
    }

    @ViewBuilder private var sessionActions: some View {
        if model.isRunning {
            Button("Зупинити") { model.sendAction("awake", "stop") }
        } else {
            ForEach(SessionPreset.all) { preset in
                Button("Не спати \(preset.title)") { model.sendAction("awake", "start", ["duration": .string(preset.id)]) }
            }
            .disabled(!model.serverOnline || !model.isGranted(.sleepControl))
            if model.sleepBlocked {
                Button("Повернути сон") { model.sendAction("awake", "restoreSleep") }
            }
        }
    }
}
