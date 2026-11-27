import SwiftUI

/// Головне вікно: бічне меню збирається з дерева агента і двох нативних сторінок.
struct MainView: View {
    @EnvironmentObject private var model: AwakeModel
    @EnvironmentObject private var updates: UpdateStatus
    /// Вибір користувача. nil: типова сторінка, тобто перша сторінка дерева або «Підключення».
    @State private var picked: MainPage?
    /// Остання вибрана сторінка між запусками.
    @AppStorage("mainView.page") private var savedPage = ""
    /// Власник закрив заставку сам, бо сервер не запустився.
    @State private var splashSkipped = false

    var body: some View {
        AdaptiveSidebar(
            selection: Binding(get: { selection }, set: { picked = $0; savedPage = $0.storageKey }),
            sections: sections,
            title: { title(of: $0) },
            symbol: { symbol(of: $0) },
            disabledReason: { disabledReason(of: $0) },
            onReorder: model.uiTree == nil ? nil : { reorder($0) },
            footer: { UpdateBanner(status: updates) }
        ) { page in
            content(for: page)
        }
        .frame(minWidth: 460, idealWidth: 720, minHeight: 360, idealHeight: 520)
        .overlay {
            if showsSplash {
                SplashView(status: model.agentStatus) { splashSkipped = true }
                    .transition(.opacity)
            }
        }
        .animation(.easeOut(duration: 0.25), value: showsSplash)
        .pairingPrompt()
    }

    /// Заставка лежить поверх вікна від запуску аппки до першого свіжого дерева від сервера.
    /// Пізніші перепідключення (сервер перезапустився з новою збіркою) оновлюють вікно без неї.
    private var showsSplash: Bool {
        model.agentEnabled && !model.treeIsFresh && !splashSkipped
    }

    /// Вибір у цьому запуску, далі збережений з минулого (якщо така сторінка ще є), далі перша.
    private var selection: MainPage {
        let all = sections.flatMap(\.items).filter { disabledReason(of: $0) == nil }
        if let picked, all.contains(picked) { return picked }
        if let saved = MainPage(storageKey: savedPage), all.contains(saved) { return saved }
        return all.first ?? .connection
    }

    /// Бічне меню: головний пункт модуля — його назва (Awake), він відкриває першу сторінку модуля з керуванням;
    /// решта сторінок вкладені під ним. Далі системні сторінки дерева і нативні «Сервер» та «Підключення».
    /// Без дерева (агент не запущений) лишаються лише нативні.
    private var sections: [SidebarSection<MainPage>] {
        // Статистика сервера — окрема вкладена сторінка, як «Статистика» в модулів.
        let native = [SidebarNode(item: MainPage.server, children: [.serverStats])]
            + [SidebarNode(item: MainPage.connection)]
        guard let tree = model.uiTree else { return [SidebarSection(nodes: native)] }
        let pagesOf = { (id: String) in
            tree.pages.filter { $0.module == id && $0.group == .modules }.map { MainPage.remote(id: $0.id) }
        }
        // Модуль з `parent` (Групи → Telegram) не має свого пункту: його сторінки — діти провайдера, після його власних.
        let modules = tree.modules.filter { $0.parent == nil }.compactMap { module -> SidebarNode<MainPage>? in
            // Вимкнений модуль: сірий пункт без дітей і без сторінки.
            if module.disabled != nil { return SidebarNode(item: .disabledModule(id: module.id)) }
            let pages = pagesOf(module.id)
            guard let main = pages.first else { return nil }
            let nested = tree.modules.filter { $0.parent == module.id && $0.disabled == nil }.flatMap { pagesOf($0.id) }
            return SidebarNode(item: main, children: Array(pages.dropFirst()) + nested)
        }
        let system = tree.pages.filter { $0.group == .system }.map { SidebarNode(item: MainPage.remote(id: $0.id)) }
        return [SidebarSection(nodes: modules), SidebarSection(nodes: system + native)]
    }

    /// Новий порядок модулів іде на сервер: він його зберігає і віддає дерево вже в цьому порядку (і вебу теж).
    private func reorder(_ items: [MainPage]) {
        let ids = items.compactMap { item -> String? in
            switch item {
            case .remote(let id): treePage(id)?.module
            case .disabledModule(let id): id
            default: nil
            }
        }
        model.sendUiEvent(.action(UiAction(module: "bot", name: "reorderModules", params: ["ids": .string(ids.joined(separator: ","))])))
    }

    /// Модуль, головною сторінкою якого є ця: тоді пункт і заголовок носять назву та іконку модуля.
    private func moduleOwning(_ id: String) -> UiModuleInfo? {
        guard let tree = model.uiTree, let page = treePage(id) else { return nil }
        let first = tree.pages.first { $0.module == page.module && $0.group == .modules }
        return first?.id == id ? tree.modules.first { $0.id == page.module } : nil
    }

    /// Динамічні сторінки, у які аппка вшиває власну секцію (токени й ключі живуть лише на Mac).
    private static let mixedPages: Set<String> = ["telegram", "relay", "permissions"]

    private func treePage(_ id: String) -> UiPage? {
        model.uiTree?.pages.first { $0.id == id }
    }

    private func treeModule(_ id: String) -> UiModuleInfo? {
        model.uiTree?.modules.first { $0.id == id }
    }

    private func disabledReason(of page: MainPage) -> String? {
        guard case .disabledModule(let id) = page else { return nil }
        return treeModule(id)?.disabled ?? "Вимкнено"
    }

    private func title(of page: MainPage) -> String {
        switch page {
        case .remote(let id): moduleOwning(id)?.title ?? treePage(id)?.title ?? ""
        case .disabledModule(let id): treeModule(id)?.title ?? id
        case .connection: "Підключення"
        case .server: "Сервер"
        case .serverStats: "Статистика"
        }
    }

    private func symbol(of page: MainPage) -> String {
        switch page {
        case .remote(let id): moduleOwning(id)?.icon.symbol ?? treePage(id)?.icon.symbol ?? "questionmark.circle"
        case .disabledModule(let id): treeModule(id)?.icon.symbol ?? "questionmark.circle"
        case .connection: "antenna.radiowaves.left.and.right"
        case .server: "server.rack"
        case .serverStats: "chart.bar.xaxis"
        }
    }

    @ViewBuilder
    private func content(for page: MainPage) -> some View {
        switch page {
        case .remote(let id):
            if let uiPage = treePage(id) {
                if Self.mixedPages.contains(uiPage.id) {
                    // Змішана сторінка: нативна секція аппки (токени й ключі живуть лише на Mac) і секції агента,
                    // кожна позначається окремо.
                    Form {
                        if uiPage.id == "telegram" {
                            TelegramSection().originHighlight(.native, scope: .section)
                        }
                        if uiPage.id == "relay" {
                            WebhooksSection().originHighlight(.native, scope: .section)
                        }
                        ForEach(uiPage.children) { UiNodeView(node: $0).originHighlight(.agent, scope: .section) }
                        if uiPage.id == "permissions" {
                            PermissionSection().originHighlight(.native, scope: .section)
                        }
                    }
                    .formStyle(.grouped)
                } else {
                    Form {
                        ForEach(uiPage.children) { UiNodeView(node: $0) }
                    }
                    .formStyle(.grouped)
                    .originHighlight(.agent, scope: .page)
                }
            } else {
                ContentUnavailableView("Агент не запущений", systemImage: "server.rack",
                                       description: Text(model.agentStatus.statusText))
            }
        case .connection:
            Form {
                EnvifySection()
                AppSecretsSection()
            }
            .formStyle(.grouped)
            .originHighlight(.native, scope: .page)
        case .server:
            Form {
                ServerSection()
                InterfaceOriginSection()
            }
            .formStyle(.grouped)
            .originHighlight(.native, scope: .page)
        case .serverStats:
            if model.agentStatus.isRunning, let info = model.serverInfo {
                Form {
                    ServerStatsSections(pid: info.pid)
                }
                .formStyle(.grouped)
                .originHighlight(.native, scope: .page)
            } else {
                ContentUnavailableView("Агент не запущений", systemImage: "chart.bar.xaxis",
                                       description: Text(model.agentStatus.statusText))
            }
        case .disabledModule:
            EmptyView()
        }
    }
}
