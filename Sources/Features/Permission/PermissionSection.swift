import SwiftUI

/// Рідна секція на сторінці «Дозволи», яку дає сервер. Тут лише те, що macOS досі видає самій аппці:
/// геолокація (назва Wi-Fi) і Bluetooth. Правила sudoers і перемикачі модулів — секції сервера на тій самій сторінці.
struct PermissionSection: View {
    @EnvironmentObject private var model: AwakeModel

    var body: some View {
        Section {
            LocationPermissionRow()
            BluetoothPermissionRow()
        } header: {
            Text("Аппка на Mac")
        } footer: {
            Text("Геолокація потрібна лише щоб бачити назву мережі Wi-Fi, Bluetooth — щоб модуль «Поруч» бачив ваш iPhone чи Apple Watch.")
        }
        .onAppear {
            model.refreshWifi()
            model.refreshBluetooth()
        }
    }
}

/// Геолокація: macOS віддає назву мережі Wi-Fi лише з нею, а за назвою агент знає, чи мережа довірена.
private struct LocationPermissionRow: View {
    @EnvironmentObject private var model: AwakeModel

    var body: some View {
        let granted = model.wifiAuthorized
        SettingsRow(title: "Назва мережі Wi-Fi", symbol: "location.fill", color: granted ? .green : .gray) {
            HStack(spacing: 8) {
                StatusDot(color: granted ? .green : .gray)
                Text(granted ? "Видано" : "Не видано").foregroundStyle(.secondary)
                if !granted {
                    if model.wifiDenied {
                        Button("Відкрити налаштування…") {
                            NSWorkspace.shared.open(URL(string: "x-apple.systempreferences:com.apple.preference.security?Privacy_LocationServices")!)
                        }
                    } else {
                        Button("Надати…") { model.wifi.requestAccess() }
                    }
                }
            }
        }
        .help("Дозвіл геолокації macOS. Без нього аппка не бачить назву мережі, тож агент не знає, чи Mac у довіреній Wi-Fi, і відповідає тільки цьому Mac.")
    }
}

/// Bluetooth: модуль «Поруч» за сигналом iPhone чи Apple Watch блокує Mac, коли ви відходите.
private struct BluetoothPermissionRow: View {
    @EnvironmentObject private var model: AwakeModel

    var body: some View {
        let granted = model.bluetoothAuthorized
        SettingsRow(title: "Bluetooth", symbol: "dot.radiowaves.left.and.right", color: granted ? .green : .gray) {
            HStack(spacing: 8) {
                StatusDot(color: granted ? .green : .gray)
                Text(granted ? "Видано" : "Не видано").foregroundStyle(.secondary)
                if !granted {
                    Button(model.bluetoothDenied ? "Відкрити налаштування…" : "Надати…") { model.requestBluetoothAccess() }
                }
            }
        }
        .help("Дозвіл Bluetooth macOS. Потрібен модулю «Поруч»: без нього Mac не бачить ваш iPhone чи Apple Watch і не блокується, коли ви відходите.")
    }
}
