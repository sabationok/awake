import SwiftUI

/// The window: Umbra shell with the server's menu (same rules as web-umbra), header B with back and crumbs, the
/// level's tabs, the selected page's nodes.
struct TreeRoot: View {
    @ObservedObject var server: ServerConnection
    let options: LaunchOptions
    @State private var page: String?

    init(server: ServerConnection, options: LaunchOptions) {
        self.server = server
        self.options = options
        _page = State(initialValue: options.page)
    }

    private var sections: [SidebarSection] { Sidebar.sections(server.tree) }
    private var menuPages: [UiPage] { Sidebar.pages(sections) }
    private var current: UiPage? { menuPages.first { $0.id == page } ?? menuPages.first }
    private var path: [SidebarNode] { Sidebar.path(sections, to: current?.id) }

    var body: some View {
        let level = Sidebar.level(of: path)
        UmbraShell(chrome: .unifiedToolbar) {
            UmbraSidebar(groups: SidebarItems.groups(sections, tree: server.tree), selection: $page) {
                host
            } footer: {
                Text("MaControl Umbra · dev")
                    .font(.system(size: 10))
                    .foregroundStyle(.secondary)
                    .padding(14)
            }
        } header: { ctx in
            UmbraHeader(current?.title ?? "MaControl", crumbs: crumbs,
                        onBack: parent.map { p in { page = p.id } },
                        onMenu: ctx.compact ? ctx.toggleSidebar : nil,
                        onCrumb: { page = $0.id })
        } content: { _ in
            VStack(alignment: .leading, spacing: 18) {
                if level.tabs.count > 1, let id = current?.id {
                    UmbraTabs(selection: Binding(get: { id }, set: { page = $0 }),
                              options: level.tabs.map { UmbraOption($0.id, $0.title) })
                }
                if !server.connected {
                    UmbraNotice(tone: .red, symbol: "bolt.horizontal.circle", title: "Сервер недоступний",
                                text: server.problem ?? "Перепідключення щосекунди…")
                } else if let problem = server.problem {
                    UmbraNotice(tone: .yellow, symbol: "exclamationmark.triangle", title: "Проблема", text: problem)
                }
                if let current {
                    NodeStack(nodes: current.children, send: server.send)
                } else if server.connected {
                    UmbraEmptyState("Чекаю дерево від сервера…", symbol: "hourglass")
                }
            }
        }
        .umbraTheme(.dark, translucent: !options.render)
    }

    /// `.s-host`: app title, then «host · онлайн/офлайн»; the icon is accent while the server is reachable.
    private var host: some View {
        let online = server.connected && (server.tree?.app.online ?? false)
        let name = server.tree?.app.host ?? "Mac"
        return UmbraSidebarHost(server.tree?.app.title ?? "MaControl",
                                subtitle: "\(name) · \(online ? "онлайн" : "офлайн")", online: online)
    }

    /// The page this one sits under (the back button), as on the web.
    private var parent: UiPage? { path.count >= 2 ? path[path.count - 2].page : nil }
    private var crumbs: [UmbraCrumb] { path.dropLast().map { UmbraCrumb(id: $0.page.id, title: $0.page.title) } }
}

/// Menu sections → Umbra sidebar groups. A disabled module stays visible, greyed, with the reason as a hint.
enum SidebarItems {
    static func groups(_ sections: [SidebarSection], tree: UiTree?) -> [UmbraSidebarGroup] {
        let reasons = Dictionary((tree?.modules ?? []).compactMap { m in m.disabled.map { (m.id, $0) } },
                                 uniquingKeysWith: { a, _ in a })
        func item(_ node: SidebarNode, top: Bool) -> UmbraSidebarItem {
            let reason = top ? reasons[node.page.module] : nil
            return UmbraSidebarItem(id: node.page.id, title: node.page.title,
                                    symbol: top ? node.page.icon.symbol : nil,
                                    disabled: reason != nil, hint: reason,
                                    children: node.children.map { item($0, top: false) })
        }
        return sections.map { section in
            UmbraSidebarGroup(id: section.key, title: section.key == "system" ? "Система" : nil,
                              items: section.nodes.map { item($0, top: true) })
        }
    }
}
