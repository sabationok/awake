import Foundation

/// Внутрішній врапер: дозвіл можна використати, лише якщо аппці видано право в системі,
/// модуль агента його декларує і користувач не вимкнув його для модуля.
enum PermissionGate {
    private static let declarationsKey = "permission.declarations"

    /// Поки агент жодного разу не надіслав дерево: Awake працює сам, як до модулів.
    private static let builtIn: [String: [String]] = ["awake": [AppPermission.sleepControl.rawValue, AppPermission.thermalRead.rawValue]]

    private static func key(_ module: String, _ permission: AppPermission) -> String {
        "permission.\(module).\(permission.rawValue)"
    }

    /// Останні декларації модулів від агента: id модуля → імена дозволів. Переживають перезапуск і офлайн агента.
    static var declarations: [String: [String]] {
        UserDefaults.standard.dictionary(forKey: declarationsKey) as? [String: [String]] ?? builtIn
    }

    static func remember(_ modules: [UiModuleInfo]) {
        let map = Dictionary(modules.map { ($0.id, $0.permissions ?? []) }, uniquingKeysWith: { first, _ in first })
        UserDefaults.standard.set(map, forKey: declarationsKey)
    }

    static func declares(_ permission: AppPermission, module: String) -> Bool {
        declarations[module]?.contains(permission.rawValue) ?? false
    }

    /// Перемикач «Дозволено модулю». За замовчуванням увімкнено.
    static func moduleAllowed(_ permission: AppPermission, module: String) -> Bool {
        UserDefaults.standard.object(forKey: key(module, permission)) as? Bool ?? true
    }

    static func setModuleAllowed(_ allowed: Bool, _ permission: AppPermission, module: String) {
        UserDefaults.standard.set(allowed, forKey: key(module, permission))
    }

    static func isUsable(_ permission: AppPermission, by module: String, appGranted: Bool) -> Bool {
        appGranted && declares(permission, module: module) && moduleAllowed(permission, module: module)
    }

    /// Скрипт читає температуру, якщо це дозволено хоча б одному модулю, що її декларує.
    static var thermalForScript: Bool {
        declarations.keys.contains { isUsable(.thermalRead, by: $0, appGranted: true) }
    }
}
