import SwiftUI

/// Головне вікно: бічне меню збирається з дерева агента і двох нативних сторінок.
struct MainView: View {
    @EnvironmentObject private var model: AwakeModel
    @EnvironmentObject private var updates: UpdateStatus
    /// Вибір користувача. nil: типова сторінка, тобто перша сторінка дерева або «Підключення».
    @State private var picked: MainPage?
    /// Остання вибрана сторінка між запусками.
    @AppStorage("mainView.page") private var savedPage = ""

    var body: some View {
        AdaptiveSidebar(
            selection: Binding(get: { selection }, set: { picked = $0; savedPage = $0.storageKey }),
            sections: sections,
            title: { title(of: $0) },
            symbol: { symbol(of: $0) },
            footer: { UpdateBanner(status: updates) }
        ) { page in
            content(for: page)
        }
        .frame(minWidth: 460, idealWidth: 720, minHeight: 360, idealHeight: 520)
        .pairingPrompt()
    }

    /// Вибір у цьому запуску, далі збережений з минулого (якщо така сторінка ще є), далі перша.
    private var selection: MainPage {
        let all = sections.flatMap(\.items)
        if let picked, all.contains(picked) { return picked }
        if let saved = MainPage(storageKey: savedPage), all.contains(saved) { return saved }
        return all.first ?? .connection
    }

    /// Бічне меню: головний пункт модуля — його назва (Awake), він відкриває першу сторінку модуля з керуванням;
    /// решта сторінок вкладені під ним. Далі системні сторінки дерева і нативні «Підключення», «Пристрої» та «Дозвіл».
    /// Без дерева (агент не запущений) лишаються лише нативні.
    private var sections: [SidebarSection<MainPage>] {
        let native = [MainPage.connection, .devices, .permission].map { SidebarNode(item: $0) }
        guard let tree = model.uiTree else { return [SidebarSection(nodes: native)] }
        let modules = tree.modules.compactMap { module -> SidebarNode<MainPage>? in
            let pages = tree.pages
                .filter { $0.module == module.id && $0.group == .modules }
                .map { MainPage.remote(id: $0.id) }
            guard let main = pages.first else { return nil }
            return SidebarNode(item: main, children: Array(pages.dropFirst()))
        }
        let system = tree.pages.filter { $0.group == .system }.map { SidebarNode(item: MainPage.remote(id: $0.id)) }
        return [SidebarSection(nodes: modules), SidebarSection(nodes: system + native)]
    }

    /// Модуль, головною сторінкою якого є ця: тоді пункт і заголовок носять назву та іконку модуля.
    private func moduleOwning(_ id: String) -> UiModuleInfo? {
        guard let tree = model.uiTree, let page = treePage(id) else { return nil }
        let first = tree.pages.first { $0.module == page.module && $0.group == .modules }
        return first?.id == id ? tree.modules.first { $0.id == page.module } : nil
    }

    private func treePage(_ id: String) -> UiPage? {
        model.uiTree?.pages.first { $0.id == id }
    }

    private func title(of page: MainPage) -> String {
        switch page {
        case .remote(let id): moduleOwning(id)?.title ?? treePage(id)?.title ?? ""
        case .permission: "Дозвіл"
        case .connection: "Підключення"
        case .devices: "Пристрої"
        }
    }

    private func symbol(of page: MainPage) -> String {
        switch page {
        case .remote(let id): moduleOwning(id)?.icon.symbol ?? treePage(id)?.icon.symbol ?? "questionmark.circle"
        case .permission: "lock.fill"
        case .connection: "antenna.radiowaves.left.and.right"
        case .devices: "laptopcomputer.and.iphone"
        }
    }

    @ViewBuilder
    private func content(for page: MainPage) -> some View {
        switch page {
        case .remote(let id):
            if let uiPage = treePage(id) {
                Form {
                    // Токен і чат живуть лише на Mac (telegram.env), тож цю секцію малює аппка, а не агент.
                    if uiPage.module == "telegram" {
                        TelegramSection()
                    }
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
            }
            .formStyle(.grouped)
        case .devices:
            Form {
                DevicesSection()
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
