import SwiftUI

/// Головне вікно: бічне меню збирається з дерева агента і двох нативних сторінок.
struct MainView: View {
    @EnvironmentObject private var model: AwakeModel
    @EnvironmentObject private var updates: UpdateStatus
    /// Вибір користувача. nil: типова сторінка, тобто перша сторінка дерева або «Підключення».
    @State private var picked: MainPage?

    var body: some View {
        AdaptiveSidebar(
            selection: Binding(get: { selection }, set: { picked = $0 }),
            sections: sections,
            title: { title(of: $0) },
            symbol: { symbol(of: $0) },
            footer: { UpdateBanner(status: updates) }
        ) { page in
            content(for: page)
        }
        .frame(minWidth: 460, idealWidth: 720, minHeight: 360, idealHeight: 520)
    }

    private var selection: MainPage { picked ?? sections.first?.items.first ?? .connection }

    /// Бічне меню: модуль → його сторінки (Awake → Сесія, Налаштування сесії…), далі системні сторінки дерева
    /// і нативні «Підключення» та «Дозвіл». Модуль з однією сторінкою (Telegram) іде без заголовка: він і є пунктом.
    /// Без дерева (агент не запущений) лишаються лише нативні.
    private var sections: [SidebarSection<MainPage>] {
        let native: [MainPage] = [.connection, .permission]
        guard let tree = model.uiTree else { return [SidebarSection(items: native)] }
        let modules = tree.modules.compactMap { module -> SidebarSection<MainPage>? in
            let pages = tree.pages
                .filter { $0.module == module.id && $0.group == .modules }
                .map { MainPage.remote(id: $0.id) }
            guard !pages.isEmpty else { return nil }
            return SidebarSection(title: pages.count > 1 ? module.title : nil, items: pages)
        }
        let system: [MainPage] = tree.pages.filter { $0.group == .system }.map { .remote(id: $0.id) }
        return modules + [SidebarSection(items: system + native)]
    }

    private func treePage(_ id: String) -> UiPage? {
        model.uiTree?.pages.first { $0.id == id }
    }

    private func title(of page: MainPage) -> String {
        switch page {
        case .remote(let id): treePage(id)?.title ?? ""
        case .permission: "Дозвіл"
        case .connection: "Підключення"
        }
    }

    private func symbol(of page: MainPage) -> String {
        switch page {
        case .remote(let id): treePage(id)?.icon.symbol ?? "questionmark.circle"
        case .permission: "lock.fill"
        case .connection: "antenna.radiowaves.left.and.right"
        }
    }

    @ViewBuilder
    private func content(for page: MainPage) -> some View {
        switch page {
        case .remote(let id):
            if let uiPage = treePage(id) {
                Form {
                    ForEach(uiPage.children) { UiNodeView(node: $0) }
                }
                .formStyle(.grouped)
            } else {
                ContentUnavailableView("Агент не запущений", systemImage: "server.rack",
                                       description: Text(model.agentStatus.statusText))
            }
        case .connection:
            Form {
                RemoteSection()
                TelegramSection()
            }
            .formStyle(.grouped)
        case .permission:
            Form {
                PermissionSection()
            }
            .formStyle(.grouped)
        }
    }
}
