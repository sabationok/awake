import SwiftUI

/// Дозволи за рівнями: спершу аппка в цілому, далі кожен модуль зі своїми перемикачами.
struct PermissionSection: View {
    @EnvironmentObject private var model: AwakeModel

    var body: some View {
        Section {
            SettingsRow(title: "Права sudo",
                        symbol: model.permissionGranted ? "checkmark.shield.fill" : "exclamationmark.shield.fill",
                        color: model.permissionGranted ? .green : .orange) {
                if model.permissionGranted {
                    HStack(spacing: 10) {
                        Text("Видано").foregroundStyle(.secondary)
                        Button("Відкликати…") { model.revokePermission() }
                            .disabled(model.isRunning)
                    }
                } else {
                    Button("Надати дозвіл…") { model.grantPermission() }
                        .buttonStyle(.borderedProminent)
                }
            }
        } header: {
            Text("Застосунок")
        } footer: {
            Text("Одне правило sudoers з трьома командами без пароля. macOS попросить пароль один раз.")
        }

        ForEach(AppModule.allCases) { module in
            Section {
                ForEach(module.permissions) { permission in
                    ModulePermissionRow(module: module, permission: permission)
                }
            } header: {
                Text(module.title)
            }
        }
    }
}

/// Перемикач «Дозволено модулю» і для чого потрібен дозвіл.
private struct ModulePermissionRow: View {
    let module: AppModule
    let permission: AppPermission
    @State private var allowed: Bool

    init(module: AppModule, permission: AppPermission) {
        self.module = module
        self.permission = permission
        _allowed = State(initialValue: PermissionGate.moduleAllowed(permission, module: module))
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            SettingsRow(title: permission.title,
                        symbol: permission == .sleepControl ? "moon.zzz.fill" : "thermometer.medium",
                        color: allowed ? .blue : .gray) {
                Toggle("Дозволено модулю", isOn: $allowed)
                    .toggleStyle(.switch)
                    .labelsHidden()
            }
            Text(permission.purpose)
                .font(.caption)
                .foregroundStyle(.secondary)
                .fixedSize(horizontal: false, vertical: true)
        }
        .onChange(of: allowed) { _, value in
            PermissionGate.setModuleAllowed(value, permission, module: module)
        }
    }
}
