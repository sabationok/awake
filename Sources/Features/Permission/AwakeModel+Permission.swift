/// Дозволи належать серверу. Аппці з його знімка потрібне одне: чи можна почати сесію з меню-бара.
extension AwakeModel {
    func isGranted(_ permission: AppPermission) -> Bool {
        permissions?.granted.contains(permission.rawValue) ?? false
    }
}
