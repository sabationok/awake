import SwiftUI

/// The window: Umbra shell with the server's pages in the sidebar, header B, the selected page's nodes.
struct TreeRoot: View {
    @ObservedObject var server: ServerConnection
    let options: LaunchOptions
    @State private var page: String?

    init(server: ServerConnection, options: LaunchOptions) {
        self.server = server
        self.options = options
        _page = State(initialValue: options.page)
    }

    private var pages: [UiPage] { server.tree?.pages ?? [] }
    private var current: UiPage? { pages.first { $0.id == page } ?? pages.first }

    private var groups: [UmbraSidebarGroup] {
        guard let tree = server.tree else { return [] }
        let disabled = Dictionary(tree.modules.map { ($0.id, $0.disabled != nil) }, uniquingKeysWith: { a, _ in a })
        func items(_ group: UiPage.Group) -> [UmbraSidebarItem] {
            tree.pages.filter { $0.group == group }.map {
                UmbraSidebarItem(id: $0.id, title: $0.title, symbol: $0.icon.symbol, tone: $0.icon.tone.umbra,
                                 disabled: disabled[$0.module] ?? false)
            }
        }
        return [
            UmbraSidebarGroup(id: "modules", title: "Модулі", items: items(.modules)),
            UmbraSidebarGroup(id: "system", title: "Система", items: items(.system)),
        ].filter { !$0.items.isEmpty }
    }

    var body: some View {
        UmbraShell(chrome: .unifiedToolbar) {
            UmbraSidebar(groups: groups, selection: $page) {
                UmbraSidebarHost(server.tree?.app.host ?? "MaControl",
                                 subtitle: server.connected ? "сервер на зв'язку" : "сервер недоступний",
                                 status: server.connected ? .green : .red)
            } footer: {
                Text("MaControl Umbra · dev")
                    .font(.system(size: 10))
                    .foregroundStyle(.secondary)
                    .padding(14)
            }
        } header: { ctx in
            UmbraHeader(current?.title ?? "MaControl", onMenu: ctx.compact ? ctx.toggleSidebar : nil)
        } content: { _ in
            VStack(alignment: .leading, spacing: 18) {
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
        .onAppear { if page == nil { page = pages.first?.id } }
        .onChange(of: server.tree?.pages.first?.id) { _, first in if page == nil { page = first } }
    }
}
