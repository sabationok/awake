import AppKit
import SwiftUI

/// One entry of the sidebar tree. The consumer builds it from its own data (e.g. the SDUI navigation).
/// A disabled item stays visible, greyed, and cannot be picked.
public struct UmbraSidebarItem: Identifiable, Hashable {
    public var id: String
    public var title: String
    public var symbol: String?
    public var tone: UmbraTone?
    public var badge: String?
    public var disabled: Bool
    /// Why the item is disabled; shown as a tooltip.
    public var hint: String?
    public var children: [UmbraSidebarItem]

    /// `tone` is kept for API compatibility; the menu draws icons monochrome, as the web does.
    public init(id: String, title: String, symbol: String? = nil, tone: UmbraTone? = nil, badge: String? = nil,
                disabled: Bool = false, hint: String? = nil, children: [UmbraSidebarItem] = []) {
        self.id = id
        self.hint = hint
        self.title = title
        self.symbol = symbol
        self.tone = tone
        self.badge = badge
        self.disabled = disabled
        self.children = children
    }

    func contains(_ target: String) -> Bool {
        children.contains { $0.id == target || $0.contains(target) }
    }
}

/// Group of sidebar items under an optional caps title.
public struct UmbraSidebarGroup: Identifiable, Hashable {
    public var id: String
    public var title: String?
    public var items: [UmbraSidebarItem]

    public init(id: String, title: String? = nil, items: [UmbraSidebarItem]) {
        self.id = id
        self.title = title
        self.items = items
    }
}

/// Sidebar (`.s-side` in web-umbra): optional block on top (host), groups of a recursive tree, optional footer.
/// Groups after the first are set apart by a hairline; a group title is drawn only when given.
/// Top-level items have a monochrome icon (accent when active or holding the current page) and a chevron that
/// expands their children; ancestors of the selection are always expanded. Sub-items have no icon, are indented
/// and the active one has an accent dot.
public struct UmbraSidebar<Top: View, Footer: View>: View {
    private let groups: [UmbraSidebarGroup]
    @Binding private var selection: String?
    private let top: Top
    private let footer: Footer
    @State private var open: Set<String> = []
    @Environment(\.umbra) private var theme

    public init(groups: [UmbraSidebarGroup], selection: Binding<String?>,
                @ViewBuilder top: () -> Top, @ViewBuilder footer: () -> Footer) {
        self.groups = groups
        _selection = selection
        self.top = top()
        self.footer = footer()
    }

    public var body: some View {
        let p = theme.palette
        VStack(alignment: .leading, spacing: 0) {
            top
            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    ForEach(Array(groups.enumerated()), id: \.element.id) { index, group in
                        VStack(alignment: .leading, spacing: 0) {
                            if index > 0 {
                                Rectangle().fill(p.line).frame(height: 1)
                                    .padding(.top, 14).padding(.bottom, 12)
                            }
                            if let title = group.title {
                                Text(title.uppercased())
                                    .font(.system(size: 11, weight: .medium))
                                    .tracking(0.66)
                                    .foregroundStyle(p.fg3)
                                    .padding(.horizontal, 8)
                                    .padding(.bottom, 6)
                            }
                            ForEach(group.items) { item in
                                UmbraSidebarNode(item: item, depth: 0, selection: $selection, open: $open)
                            }
                        }
                    }
                }
                .padding(.horizontal, 8)
                .padding(.top, 4)
                .padding(.bottom, 12)
            }
            footer
        }
        .frame(maxHeight: .infinity, alignment: .top)
        .onAppear { openAncestors() }
        .onChange(of: selection) { _, _ in openAncestors() }
    }

    /// Ancestors of the current page are always expanded.
    private func openAncestors() {
        guard let selection else { return }
        func walk(_ item: UmbraSidebarItem) {
            if item.contains(selection) { open.insert(item.id) }
            item.children.forEach(walk)
        }
        groups.flatMap(\.items).forEach(walk)
    }
}

public extension UmbraSidebar where Top == EmptyView, Footer == EmptyView {
    init(groups: [UmbraSidebarGroup], selection: Binding<String?>) {
        self.init(groups: groups, selection: selection, top: { EmptyView() }, footer: { EmptyView() })
    }
}

/// One node with its children; recursion goes through `AnyView` so the type stays finite.
struct UmbraSidebarNode: View {
    let item: UmbraSidebarItem
    let depth: Int
    @Binding var selection: String?
    @Binding var open: Set<String>
    @State private var hovering = false
    @Environment(\.umbra) private var theme

    var body: some View {
        let expanded = open.contains(item.id) && !item.disabled
        VStack(alignment: .leading, spacing: 0) {
            HStack(spacing: 0) {
                if depth == 0 { topRow } else { subRow }
                if !item.children.isEmpty && !item.disabled { chevron(expanded) }
            }
            .background {
                if depth == 0 {
                    RoundedRectangle(cornerRadius: 8, style: .continuous)
                        .fill(active ? theme.palette.surface2 : (hovering ? theme.palette.surface1 : .clear))
                }
            }
            .onHover { hovering = $0 }
            .opacity(item.disabled ? 0.45 : 1)
            .help(item.hint ?? "")

            if expanded {
                ForEach(item.children) { child in
                    AnyView(UmbraSidebarNode(item: child, depth: depth + 1, selection: $selection, open: $open))
                }
            }
        }
    }

    private var active: Bool { selection == item.id }
    private var inside: Bool { !active && (selection.map(item.contains) ?? false) }

    /// `.s-item`: icon + title, 13.5 pt, fg-2; active and «inside» go to fg, their icon to accent.
    private var topRow: some View {
        let p = theme.palette
        return Button {
            selection = item.id
        } label: {
            HStack(spacing: 10) {
                if let symbol = item.symbol {
                    Image(systemName: UmbraSymbol.outline(symbol))
                        .font(.system(size: 14, weight: .regular))
                        .foregroundStyle(active || inside ? p.accent : p.fg3)
                        .frame(width: 16, height: 16)
                }
                Text(item.title)
                    .font(.system(size: 13.5))
                    .foregroundStyle(active || inside || hovering ? p.fg : p.fg2)
                    .lineLimit(1)
                Spacer(minLength: 0)
                if let badge = item.badge {
                    Text(badge)
                        .font(.system(size: 10, weight: .semibold).monospacedDigit())
                        .foregroundStyle(p.accentInk)
                        .padding(.horizontal, 6)
                        .frame(height: 16)
                        .background(p.accent, in: Capsule())
                }
            }
            .padding(.horizontal, 8)
            .padding(.vertical, 7)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .disabled(item.disabled)
        .accessibilityAddTraits(active ? .isSelected : [])
    }

    /// `.s-sub`: no icon, 13 pt, fg-3, indented 34 + 14 per extra level; active (or holding the current page) is fg
    /// with an accent dot at 18 + 14 per extra level.
    private var subRow: some View {
        let p = theme.palette
        let on = active || inside
        let extra = CGFloat(depth - 1) * 14
        return Button {
            selection = item.id
        } label: {
            Text(item.title)
                .font(.system(size: 13))
                .foregroundStyle(on || hovering ? p.fg : p.fg3)
                .lineLimit(1)
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.leading, 34 + extra)
                .padding(.trailing, 8)
                .padding(.vertical, 6)
                .overlay(alignment: .leading) {
                    if on {
                        Circle().fill(p.accent).frame(width: 5, height: 5).padding(.leading, 18 + extra)
                    }
                }
                .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .disabled(item.disabled)
        .accessibilityAddTraits(active ? .isSelected : [])
    }

    /// `.s-chevron`: 26 pt, fg-3, turns 90° when expanded.
    private func chevron(_ expanded: Bool) -> some View {
        UmbraChevronButton(expanded: expanded) {
            if open.contains(item.id) { open.remove(item.id) } else { open.insert(item.id) }
        }
        .padding(.trailing, 4)
    }
}

struct UmbraChevronButton: View {
    let expanded: Bool
    let action: () -> Void
    @State private var hovering = false
    @Environment(\.umbra) private var theme

    var body: some View {
        let p = theme.palette
        Button(action: action) {
            Image(systemName: "chevron.right")
                .font(.system(size: 11, weight: .semibold))
                .rotationEffect(.degrees(expanded ? 90 : 0))
                .animation(.easeOut(duration: 0.15), value: expanded)
                .foregroundStyle(hovering ? p.fg : p.fg3)
                .frame(width: 26, height: 26)
                .background(hovering ? p.surface3 : .clear, in: RoundedRectangle(cornerRadius: 6, style: .continuous))
                .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .onHover { hovering = $0 }
        .accessibilityLabel(expanded ? "Згорнути" : "Розгорнути")
    }
}

/// Host block on top of the sidebar (`.s-host`): a symbol in a 30 pt rounded square (accent with a thin accent ring
/// when online, fg-3 otherwise), the title and a subtitle. No card behind it.
public struct UmbraSidebarHost: View {
    private let name: String
    private let subtitle: String?
    private let symbol: String
    private let online: Bool
    @Environment(\.umbra) private var theme

    public init(_ name: String, subtitle: String? = nil, symbol: String = "power", online: Bool = true) {
        self.name = name
        self.subtitle = subtitle
        self.symbol = symbol
        self.online = online
    }

    public var body: some View {
        let p = theme.palette
        HStack(spacing: 10) {
            Image(systemName: symbol)
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(online ? p.accent : p.fg3)
                .frame(width: 30, height: 30)
                .background(p.surface2, in: RoundedRectangle(cornerRadius: 9, style: .continuous))
                .overlay {
                    if online {
                        RoundedRectangle(cornerRadius: 9, style: .continuous)
                            .strokeBorder(p.accent.opacity(0.35), lineWidth: 1)
                    }
                }
            VStack(alignment: .leading, spacing: 1) {
                Text(name).font(.system(size: 14, weight: .semibold)).foregroundStyle(p.fg).lineLimit(1)
                if let subtitle {
                    Text(subtitle).font(.system(size: 12)).foregroundStyle(p.fg3).lineLimit(1).truncationMode(.tail)
                }
            }
            Spacer(minLength: 0)
        }
        .padding(.horizontal, 14)
        .padding(.top, 16)
        .padding(.bottom, 14)
    }
}

/// Menu icons are outline, like the web's lucide set: a `.fill` symbol from the host is drawn as its outline
/// sibling when one exists (`cup.and.saucer.fill` → `cup.and.saucer`).
public enum UmbraSymbol {
    public static func outline(_ name: String) -> String {
        guard name.contains(".fill") else { return name }
        let base = name.replacingOccurrences(of: ".fill", with: "")
        return NSImage(systemSymbolName: base, accessibilityDescription: nil) == nil ? name : base
    }
}
