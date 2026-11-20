import SwiftUI

/// Дозволи на двох рівнях. «Система»: що macOS дозволила самій аппці (правило sudoers), це видає лише користувач.
/// «Модулі»: що з цього кожен модуль агента просить і чи користувач лишив йому це. Список модулів і їхні
/// декларації приходять із сервера (агента), Mac-аппка їх не вигадує.
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
            ForEach(AppPermission.allCases) { permission in
                SystemPermissionRow(permission: permission, granted: model.permissionGranted)
            }
        } header: {
            Text("Система")
        } footer: {
            Text("Одне правило sudoers з трьома командами без пароля. macOS попросить пароль один раз. Модулі не можуть отримати більше, ніж видано тут.")
        }

        // Лише модулі, що просять хоч один системний дозвіл: решті тут нічого видавати.
        if let modules = model.uiTree?.modules.filter({ !($0.permissions ?? []).isEmpty }) {
            ForEach(modules) { module in
                ModuleSection(module: module, systemGranted: model.permissionGranted)
            }
        } else {
            Section {
                Text("Агент не підключений. Список модулів і дозволи, які вони просять, приходять із сервера.")
                    .foregroundStyle(.secondary)
            } header: {
                Text("Модулі")
            }
        }
    }
}

/// Що система дозволила аппці: один дозвіл і команди, які він покриває.
private struct SystemPermissionRow: View {
    let permission: AppPermission
    let granted: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            SettingsRow(title: permission.title, symbol: permission.symbol, color: granted ? .green : .gray,
                        text: granted ? "Видано" : "Не видано")
            Text(permission.commands.joined(separator: "\n"))
                .font(.caption.monospaced())
                .foregroundStyle(.secondary)
                .textSelection(.enabled)
        }
    }
}

/// Модуль від сервера і дозволи, які він декларує.
private struct ModuleSection: View {
    let module: UiModuleInfo
    let systemGranted: Bool

    var body: some View {
        let requested = module.permissions ?? []
        let known = requested.compactMap(AppPermission.init(rawValue:))
        let unknown = requested.filter { AppPermission(rawValue: $0) == nil }
        Section {
            ForEach(known) { permission in
                ModulePermissionRow(module: module.id, permission: permission, systemGranted: systemGranted)
            }
            ForEach(unknown, id: \.self) { name in
                SettingsRow(title: name, symbol: "questionmark.circle", color: .gray,
                            text: "Не підтримується цією версією")
            }
        } header: {
            Label(module.title, systemImage: module.icon.symbol)
        }
    }
}

/// Перемикач «Дозволено модулю» і для чого потрібен дозвіл.
private struct ModulePermissionRow: View {
    let module: String
    let permission: AppPermission
    let systemGranted: Bool
    @State private var allowed: Bool

    init(module: String, permission: AppPermission, systemGranted: Bool) {
        self.module = module
        self.permission = permission
        self.systemGranted = systemGranted
        _allowed = State(initialValue: PermissionGate.moduleAllowed(permission, module: module))
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            SettingsRow(title: permission.title, symbol: permission.symbol,
                        color: allowed && systemGranted ? .blue : .gray) {
                Toggle("Дозволено модулю", isOn: $allowed)
                    .toggleStyle(.switch)
                    .labelsHidden()
            }
            Text(systemGranted ? permission.purpose : "\(permission.purpose) Не діє, поки систему не дозволено вище.")
                .font(.caption)
                .foregroundStyle(.secondary)
                .fixedSize(horizontal: false, vertical: true)
        }
        .onChange(of: allowed) { _, value in
            PermissionGate.setModuleAllowed(value, permission, module: module)
        }
    }
}
