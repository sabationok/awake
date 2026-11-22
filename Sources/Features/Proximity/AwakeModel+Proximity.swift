import AppKit

/// «Поруч»: аппка сканує Bluetooth, поки ввімкнено `proximity.enabled`, і шле агенту звіт. Блокує агент командою `lock`.
extension AwakeModel {
    func setupProximity() {
        bluetooth.onReport = { [weak self] report in self?.agent.send(type: "proximity", data: report) }
        bluetooth.onAuthorizationChange = { [weak self] in self?.refreshBluetooth() }
        refreshBluetooth()
    }

    func refreshBluetooth() {
        if bluetoothAuthorized != bluetooth.isAuthorized { bluetoothAuthorized = bluetooth.isAuthorized }
        if bluetoothDenied != bluetooth.isDenied { bluetoothDenied = bluetooth.isDenied }
    }

    func requestBluetoothAccess() {
        if bluetoothDenied {
            NSWorkspace.shared.open(URL(string: "x-apple.systempreferences:com.apple.preference.security?Privacy_Bluetooth")!)
        } else {
            bluetooth.requestAccess()
        }
    }

    /// Налаштування модуля «Поруч» від агента. Поріг, затримку й режим застосовує агент, аппці потрібні лише ці два.
    func applyProximitySetting(key: String, value: UiScalar) -> Bool {
        switch key {
        case "proximity.enabled":
            guard let enabled = value.boolValue else { return false }
            bluetooth.setEnabled(enabled)
            refreshBluetooth()
        case "proximity.device":
            guard let id = value.stringValue else { return false }
            bluetooth.target = id.isEmpty ? nil : id
        case "proximity.range", "proximity.delay", "proximity.when":
            break
        default:
            return false
        }
        return true
    }
}
