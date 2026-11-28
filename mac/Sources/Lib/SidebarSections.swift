import Foundation

/// 1:1 port of `web/src/lib/sidebar-sections.ts`: same types, same function names, same rules, so both
/// clients build the same menu from the same route index.

/// A menu node: a page and its child nodes (Awake → Налаштування сесії, Трекінг…). Recursive: a nested module
/// (Групи under Telegram) is a child node with its own pages.
struct SidebarNode: Hashable {
    var page: UiPageInfo
    var children: [SidebarNode]
}

/// A group of menu items, set apart from the others.
struct SidebarSection: Hashable {
    var key: String
    var nodes: [SidebarNode]
}

/// A module is its first page, the module's other pages are its children; system pages follow as their own
/// group. Empty groups are dropped. Module order comes from `shell.modules`.
func sidebarSections(_ shell: UiShell?) -> [SidebarSection] {
    let pages = shell?.pages ?? []
    let modules = shell?.modules ?? []
    func pagesOf(_ id: String) -> [UiPageInfo] { pages.filter { $0.module == id && $0.group == .modules } }
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
func sidebarPages(_ sections: [SidebarSection]) -> [UiPageInfo] {
    func walk(_ node: SidebarNode) -> [UiPageInfo] { [node.page] + node.children.flatMap(walk) }
    return sections.flatMap { $0.nodes.flatMap(walk) }
}

/// Path from the root to page `id`: [module, …, the page]; empty when there is no such page.
func pathTo(_ sections: [SidebarSection], _ id: String?) -> [SidebarNode] {
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
func levelOf(_ path: [SidebarNode]) -> (level: SidebarNode?, tabs: [UiPageInfo]) {
    let current = path.last
    let level: SidebarNode? = (current?.children.isEmpty == false) ? current : (path.count >= 2 ? path[path.count - 2] : nil)
    return (level, level.map { [$0.page] + $0.children.map(\.page) } ?? [])
}
