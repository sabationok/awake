/// Дозволи належать серверу: він перевіряє їх через помічник і зберігає перемикачі модулів.
/// Аппка показує знімок від сервера і шле йому натискання.
extension AwakeModel {
    func isGranted(_ permission: AppPermission) -> Bool {
        permissions?.granted.contains(permission.rawValue) ?? false
    }

    /// Перемикач «Дозволено модулю». За замовчуванням увімкнено.
    func isAllowed(_ permission: AppPermission, module: String) -> Bool {
        !(permissions?.denied.contains { $0.module == module && $0.permission == permission.rawValue } ?? false)
    }

    /// Вікно пароля macOS показує помічник сервера, не аппка.
    func grant(_ permission: AppPermission) {
        sendPermissionClick(.init(action: "grant", permission: permission.rawValue))
    }

    func revoke(_ permission: AppPermission) {
        sendPermissionClick(.init(action: "revoke", permission: permission.rawValue))
    }

    func setAllowed(_ allowed: Bool, _ permission: AppPermission, module: String) {
        sendPermissionClick(.init(action: "setModule", permission: permission.rawValue, module: module, allowed: allowed))
    }

    private struct PermissionClick: Encodable {
        let action: String
        let permission: String
        var module: String?
        var allowed: Bool?
    }

    private func sendPermissionClick(_ click: PermissionClick) {
        agent.send(type: "permission", data: click)
    }
}
