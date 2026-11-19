extension AwakeModel {
    func grantPermission() {
        report(PermissionService.grant(), success: "Дозвіл надано")
    }

    func revokePermission() {
        report(PermissionService.revoke(), success: "Дозвіл відкликано")
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
