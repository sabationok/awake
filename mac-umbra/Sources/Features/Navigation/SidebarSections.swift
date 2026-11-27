import Foundation

/// 1:1 port of `web-umbra/src/lib/sidebar-sections.ts`, so both clients build the same menu from the same tree.

/// A menu node: a page and its child nodes (Awake → Налаштування сесії, Трекінг…). Recursive: a nested module
/// (Групи under Telegram) is a child node with its own pages.
struct SidebarNode: Hashable {
    var page: UiPage
    var children: [SidebarNode]
}

/// A group of menu items, set apart from the others.
struct SidebarSection: Hashable {
    var key: String
    var nodes: [SidebarNode]
}

enum Sidebar {
    /// A module is its first page, the module's other pages are its children; system pages follow as their own
    /// group. Empty groups are dropped. Module order comes from `tree.modules`.
    static func sections(_ tree: UiTree?) -> [SidebarSection] {
        let pages = tree?.pages ?? []
        let modules = tree?.modules ?? []
        func pagesOf(_ id: String) -> [UiPage] { pages.filter { $0.module == id && $0.group == .modules } }
        // A module with `parent` (Групи → Telegram) has no item of its own: its pages are the provider's children,
        // after the provider's own pages.
        func moduleNode(_ id: String) -> [SidebarNode] {
            let own = pagesOf(id)
            guard let page = own.first else { return [] }
            let nested = modules.filter { $0.parent == id && $0.disabled == nil }.flatMap { moduleNode($0.id) }
            return [SidebarNode(page: page, children: own.dropFirst().map { SidebarNode(page: $0, children: []) } + nested)]
        }
        let nodes = modules.filter { $0.parent == nil }.flatMap { moduleNode($0.id) }
        let system = pages.filter { $0.group == .system }.map { SidebarNode(page: $0, children: []) }
        return [SidebarSection(key: "modules", nodes: nodes), SidebarSection(key: "system", nodes: system)]
            .filter { !$0.nodes.isEmpty }
    }

    /// Every menu page in order: parent, then its children (depth first).
    static func pages(_ sections: [SidebarSection]) -> [UiPage] {
        func walk(_ node: SidebarNode) -> [UiPage] { [node.page] + node.children.flatMap(walk) }
        return sections.flatMap { $0.nodes.flatMap(walk) }
    }

    /// Path from the root to page `id`: [module, …, the page]; empty when there is no such page.
    static func path(_ sections: [SidebarSection], to id: String?) -> [SidebarNode] {
        func find(_ node: SidebarNode) -> [SidebarNode]? {
            if node.page.id == id { return [node] }
            for child in node.children {
                if let rest = find(child) { return [node] + rest }
            }
            return nil
        }
        for node in sections.flatMap(\.nodes) {
            if let path = find(node) { return path }
        }
        return []
    }

    /// Tabs of the current level. A page with children is a level itself: it and its children. A leaf page belongs
    /// to its parent's level. Without children on the level there are no tabs.
    static func level(of path: [SidebarNode]) -> (level: SidebarNode?, tabs: [UiPage]) {
        let current = path.last
        let level: SidebarNode? = (current?.children.isEmpty == false) ? current : (path.count >= 2 ? path[path.count - 2] : nil)
        return (level, level.map { [$0.page] + $0.children.map(\.page) } ?? [])
    }
}
