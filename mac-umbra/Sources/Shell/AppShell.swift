import AppKit
import SwiftUI

/// Port of `web-umbra/src/shell/app-shell.tsx`. Same parts in the same order:
/// - sidebar `.s-side`: host block, module tree with chevrons, the «Система» group, the source plaque at the bottom;
/// - top band `.s-top`: back, crumbs, h1, scope chip;
/// - the level's NavTabs `.s-tabs`;
/// - `SourceBanner`;
/// - content `.s-content`: max-width 760, 18 pt between blocks, `PageNodes`.
/// The menu comes from `Lib/SidebarSections.swift` (`sidebarSections` / `pathTo` / `levelOf`).
struct AppShell: View {
    @ObservedObject var server: ServerConnection
    let options: LaunchOptions
    @State private var hash: String?
    @StateObject private var runner = RunAction()
    @AppStorage(ThemeChoice.key) private var storedTheme = ThemeChoice.defaultTheme.rawValue

    init(server: ServerConnection, options: LaunchOptions) {
        self.server = server
        self.options = options
        _hash = State(initialValue: options.page)
    }

    var body: some View {
        let sections = sidebarSections(server.tree)
        let all = sidebarPages(sections)
        let page = all.first { $0.id == hash } ?? all.first
        let path = pathTo(sections, page?.id)
        let tabs = levelOf(path).tabs
        let crumbs = Array(path.dropLast())
        let parent = crumbs.last

        UmbraShell(chrome: .unifiedToolbar) {
            UmbraSidebar(groups: navGroups(sections), selection: $hash) {
                host
            } footer: {
                // The dev indicator's floating button sits bottom-left (the kit's default corner, no API to change
                // it): lift the source plaque above it (16 inset + 36 button + a gap).
                source.padding(.bottom, AppInfo.devBuild(options) == nil ? 0 : 52)
            }
        } header: { ctx in
            UmbraHeader(page?.title ?? "MaControl",
                        crumbs: crumbs.map { UmbraCrumb(id: $0.page.id, title: $0.page.title) },
                        onBack: parent.map { p in { hash = p.page.id } },
                        onMenu: ctx.compact ? ctx.toggleSidebar : nil,
                        onCrumb: { hash = $0.id },
                        chip: page?.scope == .local ? "лише в локальній мережі" : nil)
        } bar: { _ in
            if !tabs.isEmpty, let id = page?.id {
                UmbraNavTabs(selection: Binding(get: { id }, set: { hash = $0 }),
                             options: tabs.map { UmbraOption($0.id, $0.title) })
            }
        } content: { _ in
            VStack(alignment: .leading, spacing: 18) {
                SourceBanner(server: server)
                if page?.id == "settings" {
                    AppearanceSection(theme: Binding(get: { theme }, set: { storedTheme = $0.rawValue }))
                }
                if let page {
                    PageNodes(nodes: page.children, send: server.send)
                } else if server.connected {
                    UmbraEmptyState("Чекаю дерево від сервера…", symbol: "hourglass")
                }
            }
            .id(page?.id)
        }
        .environmentObject(runner)
        .runActionDialog(runner)
        .umbraTheme(UmbraThemeMode(rawValue: theme.rawValue) ?? .dark,
                    translucent: !options.render || options.translucent)
        .onChange(of: theme) { NSApp.appearance = $0.appearance }
        .umbraVibrancyPreview(options.wallpaper.flatMap { NSImage(contentsOfFile: $0) })
        .devIndicator(build: AppInfo.devBuild(options), preview: AppInfo.devPreview(options))
    }

    /// The stored client theme; `--theme` (screenshots) wins over it.
    private var theme: ThemeChoice {
        options.theme.flatMap(ThemeChoice.init(rawValue:)) ?? ThemeChoice.stored(storedTheme)
    }

    /// `.s-host`: app title, then «host · онлайн/офлайн»; the icon is accent while the Mac is online.
    private var host: some View {
        let online = server.connected && (server.tree?.app.online ?? false)
        return UmbraSidebarHost(server.tree?.app.title ?? "MaControl",
                                subtitle: "\(server.tree?.app.host ?? "Mac") · \(online ? "онлайн" : "офлайн")",
                                online: online)
    }

    /// `.s-demo`: where the tree comes from and whether clicks reach the server. The build's name and version are in
    /// the dev indicator, not here.
    @ViewBuilder
    private var source: some View {
        switch server.origin {
        case .socket where server.connected:
            UmbraSidebarSource("Живі дані · server.sock", detail: "Дії йдуть на сервер", symbol: "bolt.horizontal",
                               tone: .green)
        case .socket:
            UmbraSidebarSource("Сервер недоступний", detail: "Перепідключення щосекунди", symbol: "bolt.horizontal",
                               tone: .red)
        case .file:
            UmbraSidebarSource("Знімок дерева з файлу", detail: "Дії не надсилаються на сервер")
        }
    }

    /// `NavNode` / `SubNode`: a disabled module stays visible, greyed, with the reason as a hint; it does not expand.
    private func navGroups(_ sections: [SidebarSection]) -> [UmbraSidebarGroup] {
        let disabledOf = Dictionary((server.tree?.modules ?? []).compactMap { m in m.disabled.map { (m.id, $0) } },
                                    uniquingKeysWith: { a, _ in a })
        func item(_ node: SidebarNode, top: Bool) -> UmbraSidebarItem {
            let disabled = top ? disabledOf[node.page.module] : nil
            return UmbraSidebarItem(id: node.page.id, title: node.page.title,
                                    symbol: top ? node.page.icon.symbol : nil,
                                    disabled: disabled != nil, hint: disabled,
                                    children: disabled == nil ? node.children.map { item($0, top: false) } : [])
        }
        return sections.map { section in
            UmbraSidebarGroup(id: section.key, title: section.key == "system" ? "Система" : nil,
                              items: section.nodes.map { item($0, top: true) })
        }
    }
}

/// `SourceBanner`: shown when the tree is not live (the server stopped answering, or the tree did not parse).
struct SourceBanner: View {
    @ObservedObject var server: ServerConnection

    var body: some View {
        if !server.connected {
            UmbraNotice(tone: .yellow, symbol: "externaldrive.badge.exclamationmark",
                        title: server.tree == nil ? "Сервер не відповідає"
                            : "Сервер не відповідає — показую останнє отримане дерево",
                        text: server.problem ?? "Перепідключення щосекунди…")
        } else if let problem = server.problem {
            UmbraNotice(tone: .yellow, symbol: "exclamationmark.triangle", title: "Дерево не розібралось", text: problem)
        }
    }
}
