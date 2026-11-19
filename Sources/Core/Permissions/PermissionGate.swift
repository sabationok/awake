import Foundation

/// Внутрішній врапер: дозвіл можна використати, лише якщо його декларує модуль,
/// користувач не вимкнув його для модуля і аппці видано право в системі.
enum PermissionGate {
    private static func key(_ module: AppModule, _ permission: AppPermission) -> String {
        "permission.\(module.rawValue).\(permission.rawValue)"
    }

    /// Перемикач «Дозволено модулю». За замовчуванням увімкнено.
    static func moduleAllowed(_ permission: AppPermission, module: AppModule) -> Bool {
        UserDefaults.standard.object(forKey: key(module, permission)) as? Bool ?? true
    }

    static func setModuleAllowed(_ allowed: Bool, _ permission: AppPermission, module: AppModule) {
        UserDefaults.standard.set(allowed, forKey: key(module, permission))
    }

    static func isUsable(_ permission: AppPermission, by module: AppModule, appGranted: Bool) -> Bool {
        appGranted && module.permissions.contains(permission) && moduleAllowed(permission, module: module)
    }

    /// Скрипт читає температуру, якщо це дозволено хоча б одному модулю, що її використовує.
    static var thermalForScript: Bool {
        AppModule.allCases.contains { isUsable(.thermalRead, by: $0, appGranted: true) }
    }
}
