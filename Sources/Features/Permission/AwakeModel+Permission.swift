extension AwakeModel {
    func isGranted(_ permission: AppPermission) -> Bool {
        grantedPermissions.contains(permission)
    }

    func grant(_ permission: AppPermission) {
        report(PermissionService.grant(permission), success: "Дозвіл «\(permission.title)» надано")
    }

    func revoke(_ permission: AppPermission) {
        report(PermissionService.revoke(permission), success: "Дозвіл «\(permission.title)» відкликано")
    }

    /// Правила sudoers під старими іменами `awake*` → `mc-*`, один системний діалог. Лише з кнопки в «Дозволах»:
    /// при запуску macOS показала б загальний діалог пароля без контексту.
    func renameLegacyPermissionRules() {
        guard PermissionService.hasLegacyRules else { return }
        report(PermissionService.migrateLegacyRules(), success: "Правила sudoers перейменовано на mc-*")
    }

    private func report(_ outcome: PermissionService.Outcome, success: String) {
        switch outcome {
        case .done: append(success)
        case .cancelled: append("Скасовано")
        case .failed(let message): append("Помилка: \(message)")
        }
        refresh()
    }
}
