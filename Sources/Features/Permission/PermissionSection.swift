import SwiftUI

/// Дозволи на двох рівнях. «Система»: що macOS дозволила самій аппці (правило sudoers), це видає лише користувач.
/// «Модулі»: що з цього кожен модуль агента просить і чи користувач лишив йому це. Список модулів і їхні
/// декларації приходять із сервера (агента), Mac-аппка їх не вигадує.
struct PermissionSection: View {
    @EnvironmentObject private var model: AwakeModel

    var body: some View {
        Section {
            ForEach(AppPermission.allCases) { permission in
                SystemPermissionRow(permission: permission)
            }
        } header: {
            Text("Система")
        } footer: {
            Text("Кожен дозвіл — окреме правило sudoers із фіксованими командами без пароля. macOS попросить пароль при видачі й відкликанні. Модулі не можуть отримати більше, ніж видано тут.")
        }

        // Лише модулі, що просять хоч один системний дозвіл: решті тут нічого видавати.
        if let modules = model.uiTree?.modules.filter({ !($0.permissions ?? []).isEmpty }) {
            ForEach(modules) { module in
                ModuleSection(module: module)
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

/// Що система дозволила аппці: стан одного дозволу і дія для нього, як у дозволах Mia.
private struct SystemPermissionRow: View {
    @EnvironmentObject private var model: AwakeModel
    let permission: AppPermission

    var body: some View {
        let granted = model.isGranted(permission)
        SettingsRow(title: permission.title, symbol: permission.symbol, color: granted ? .green : .gray) {
            HStack(spacing: 8) {
                StatusDot(color: granted ? .green : .gray)
                Text(granted ? "Видано" : "Не видано").foregroundStyle(.secondary)
                if granted {
                    Button("Відкликати…") { model.revoke(permission) }
                        .disabled(permission == .sleepControl && model.isRunning)
                } else {
                    Button("Надати…") { model.grant(permission) }
                }
            }
        }
        .help("\(permission.purpose)\n\n" + permission.commands.joined(separator: "\n"))
    }
}

/// Модуль від сервера і дозволи, які він декларує.
private struct ModuleSection: View {
    @EnvironmentObject private var model: AwakeModel
    let module: UiModuleInfo

    var body: some View {
        let requested = module.permissions ?? []
        let known = requested.compactMap(AppPermission.init(rawValue:))
        let unknown = requested.filter { AppPermission(rawValue: $0) == nil }
        Section {
            ForEach(known) { permission in
                ModulePermissionRow(module: module.id, permission: permission, systemGranted: model.isGranted(permission))
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
