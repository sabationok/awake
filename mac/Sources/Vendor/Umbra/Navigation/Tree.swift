import SwiftUI

/// Status badge of a tree record: a label in a tone, drawn with `Badge`.
public struct TreeStatus: Hashable {
    public var label: String
    public var tone: Tone

    public init(_ label: String, tone: Tone = .gray) {
        self.label = label
        self.tone = tone
    }
}

/// One flat record of a `Tree`. Records come in display order; `parent` sets the nesting. A record whose parent is
/// unknown is drawn at the top level. `muted` is drawn grey but can still be selected.
public struct TreeItem: Identifiable, Hashable {
    public var id: String
    public var label: String
    public var parent: String?
    public var status: TreeStatus?
    public var muted: Bool

    public init(id: String, label: String, parent: String? = nil, status: TreeStatus? = nil, muted: Bool = false) {
        self.id = id
        self.label = label
        self.parent = parent
        self.status = status
        self.muted = muted
    }
}

/// Tree with a detail slot, on one section card: the records on the left (`treeWidth`, 220 pt), indented by depth,
/// a click selects one; the caller's `content(selectedId)` on the right. Branches expand and collapse (all expanded
/// at first; ancestors of the selection are always expanded). Below `stackBelow` (560 pt) the tree goes above the
/// content. The selected record is highlighted like the current item of `Sidebar`.
public struct Tree<Content: View>: View {
    private let items: [TreeItem]
    @Binding private var selection: String?
    private let treeWidth: CGFloat
    private let stackBelow: CGFloat
    private let content: (String?) -> Content
    @State private var collapsed: Set<String> = []
    @Environment(\.umbra) private var theme

    public init(items: [TreeItem], selection: Binding<String?>, treeWidth: CGFloat = 220,
                stackBelow: CGFloat = 560, @ViewBuilder content: @escaping (String?) -> Content) {
        self.items = items
        _selection = selection
        self.treeWidth = treeWidth
        self.stackBelow = stackBelow
        self.content = content
    }

    public var body: some View {
        let shape = TreeShape(items)
        TreeSplit(treeWidth: treeWidth, stackBelow: stackBelow) {
            VStack(alignment: .leading, spacing: 1) {
                ForEach(shape.visible(collapsed: collapsed)) { row in
                    TreeRow(item: row.item, depth: row.depth, branch: shape.isBranch(row.item.id),
                            expanded: !collapsed.contains(row.item.id),
                            selected: selection == row.item.id,
                            select: { selection = row.item.id },
                            toggle: { toggle(row.item.id) })
                }
            }
            .padding(6)
            Rectangle().fill(theme.palette.line)
            content(selection)
                .frame(maxWidth: .infinity, alignment: .topLeading)
                .padding(14)
        }
        .umbraSurface(.panel)
        .clipShape(RoundedRectangle(cornerRadius: Radius.md, style: .continuous))
        .onAppear { openAncestors(shape) }
        .onChange(of: selection) { _, _ in openAncestors(TreeShape(items)) }
    }

    private func toggle(_ id: String) {
        withAnimation(Motion.ease) {
            if collapsed.contains(id) { collapsed.remove(id) } else { collapsed.insert(id) }
        }
    }

    private func openAncestors(_ shape: TreeShape) {
        guard let selection else { return }
        collapsed.subtract(shape.ancestors(of: selection))
    }
}

/// Depths, branches and ancestors from the flat records; a parent cycle stops at the first repeat.
struct TreeShape {
    struct Visible: Identifiable {
        let item: TreeItem
        let depth: Int
        var id: String { item.id }
    }

    private let items: [TreeItem]
    private let parents: [String: String]
    private let branches: Set<String>

    init(_ items: [TreeItem]) {
        self.items = items
        let ids = Set(items.map(\.id))
        var parents: [String: String] = [:]
        for item in items {
            if let parent = item.parent, parent != item.id, ids.contains(parent) { parents[item.id] = parent }
        }
        self.parents = parents
        branches = Set(parents.values)
    }

    func isBranch(_ id: String) -> Bool { branches.contains(id) }

    func ancestors(of id: String) -> [String] {
        var chain: [String] = []
        var seen: Set<String> = [id]
        var current = parents[id]
        while let parent = current, seen.insert(parent).inserted {
            chain.append(parent)
            current = parents[parent]
        }
        return chain
    }

    func visible(collapsed: Set<String>) -> [Visible] {
        items.compactMap { item in
            let chain = ancestors(of: item.id)
            return chain.contains(where: collapsed.contains) ? nil : Visible(item: item, depth: chain.count)
        }
    }
}

/// One record: chevron slot (branches only), label, status badge. Selected = `surface2` like the sidebar's current
/// item, hover = `surface1`; muted = `fg3`.
struct TreeRow: View {
    let item: TreeItem
    let depth: Int
    let branch: Bool
    let expanded: Bool
    let selected: Bool
    let select: () -> Void
    let toggle: () -> Void
    @State private var hovering = false
    @Environment(\.umbra) private var theme

    var body: some View {
        let p = theme.palette
        HStack(spacing: 2) {
            Group {
                if branch {
                    ChevronButton(expanded: expanded, action: toggle)
                } else {
                    Color.clear
                }
            }
            .frame(width: 26, height: 26)
            Button(action: select) {
                HStack(spacing: 8) {
                    Text(item.label)
                        .font(.system(size: 13))
                        .foregroundStyle(color(p))
                        .lineLimit(1)
                        .truncationMode(.tail)
                    Spacer(minLength: 0)
                    if let status = item.status {
                        Badge(status.label, tone: status.tone).fixedSize().opacity(item.muted ? 0.6 : 1)
                    }
                }
                .padding(.trailing, 6)
                .frame(maxWidth: .infinity, minHeight: 30, alignment: .leading)
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
        }
        .padding(.leading, 2 + CGFloat(depth) * 14)
        .background(
            RoundedRectangle(cornerRadius: 8, style: .continuous)
                .fill(selected ? p.surface2 : (hovering ? p.surface1 : .clear))
        )
        .onHover { hovering = $0 }
        .accessibilityElement(children: .combine)
        .accessibilityAddTraits(selected ? .isSelected : [])
    }

    private func color(_ p: Palette) -> Color {
        if item.muted { return selected ? p.fg2 : p.fg3 }
        return selected || hovering ? p.fg : p.fg2
    }
}

/// Tree, divider, content: side by side when the offered width reaches `stackBelow`, else stacked (tree on top).
/// The divider is a 1 pt line across the shared edge in both cases.
struct TreeSplit: SwiftUI.Layout {
    let treeWidth: CGFloat
    let stackBelow: CGFloat

    private func wide(_ proposal: ProposedViewSize) -> Bool { (proposal.width ?? .infinity) >= stackBelow }

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        guard subviews.count == 3 else { return .zero }
        let (tree, content) = (subviews[0], subviews[2])
        if wide(proposal) {
            let width = proposal.width ?? (treeWidth + 1 + 480)
            let side = max(width - treeWidth - 1, 0)
            let height = max(tree.sizeThatFits(.init(width: treeWidth, height: nil)).height,
                             content.sizeThatFits(.init(width: side, height: nil)).height)
            return CGSize(width: width, height: height)
        }
        let width = proposal.width ?? stackBelow
        let height = tree.sizeThatFits(.init(width: width, height: nil)).height + 1
            + content.sizeThatFits(.init(width: width, height: nil)).height
        return CGSize(width: width, height: height)
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        guard subviews.count == 3 else { return }
        let (tree, line, content) = (subviews[0], subviews[1], subviews[2])
        if wide(ProposedViewSize(width: bounds.width, height: nil)) {
            let side = max(bounds.width - treeWidth - 1, 0)
            tree.place(at: bounds.origin, proposal: .init(width: treeWidth, height: bounds.height))
            line.place(at: CGPoint(x: bounds.minX + treeWidth, y: bounds.minY),
                       proposal: .init(width: 1, height: bounds.height))
            content.place(at: CGPoint(x: bounds.minX + treeWidth + 1, y: bounds.minY),
                          proposal: .init(width: side, height: bounds.height))
        } else {
            let treeHeight = tree.sizeThatFits(.init(width: bounds.width, height: nil)).height
            tree.place(at: bounds.origin, proposal: .init(width: bounds.width, height: treeHeight))
            line.place(at: CGPoint(x: bounds.minX, y: bounds.minY + treeHeight),
                       proposal: .init(width: bounds.width, height: 1))
            content.place(at: CGPoint(x: bounds.minX, y: bounds.minY + treeHeight + 1),
                          proposal: .init(width: bounds.width, height: nil))
        }
    }
}
