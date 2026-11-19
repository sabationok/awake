import SwiftUI

/// Модулі, у яких є налаштування. Новий модуль: case тут і гілка в `ModuleSettings`.
enum SettingsModule: String, CaseIterable, Identifiable {
    case awake

    var id: String { rawValue }

    var title: String {
        switch self {
        case .awake: "Awake"
        }
    }
}

/// Вкладка «Налаштування»: таби модулів, під ними форма вибраного модуля.
struct ModuleSettings: View {
    @State private var module: SettingsModule = .awake

    var body: some View {
        VStack(spacing: 0) {
            SegmentedTabs(items: SettingsModule.allCases.map { (value: $0, title: $0.title) },
                          selection: $module)
                .padding(.horizontal, 20)
                .padding(.vertical, 10)

            Form {
                switch module {
                case .awake:
                    AwakeModuleSettings()
                }
            }
            .formStyle(.grouped)
        }
    }
}

/// Налаштування Awake. Поки порожньо: події Telegram тепер у розділі Telegram.
struct AwakeModuleSettings: View {
    var body: some View {
        Section {
            Text("Налаштувань модуля поки немає").foregroundStyle(.secondary)
        }
    }
}
