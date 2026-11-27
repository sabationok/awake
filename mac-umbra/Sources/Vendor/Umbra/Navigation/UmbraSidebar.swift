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
    public var children: [UmbraSidebarItem]

    public init(id: String, title: String, symbol: String? = nil, tone: UmbraTone? = nil, badge: String? = nil,
                disabled: Bool = false, children: [UmbraSidebarItem] = []) {
        self.id = id
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

/// Sidebar (`.s-sidebar`): optional block on top (host), groups of a recursive tree, optional footer.
/// The item that holds the selected one is marked «inside» and expanded.
public struct UmbraSidebar<Top: View, Footer: View>: View {
    private let groups: [UmbraSidebarGroup]
    @Binding private var selection: String?
    private let top: Top
    private let footer: Footer
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
                VStack(alignment: .leading, spacing: 14) {
                    ForEach(groups) { group in
                        VStack(alignment: .leading, spacing: 1) {
                            if let title = group.title {
                                Text(title.uppercased())
                                    .font(.system(size: 10, weight: .semibold))
                                    .tracking(0.9)
                                    .foregroundStyle(p.fg3)
                                    .padding(.horizontal, 10)
                                    .padding(.bottom, 4)
                            }
                            ForEach(group.items) { item in
                                UmbraSidebarNode(item: item, depth: 0, selection: $selection)
                            }
                        }
                    }
                }
                .padding(.horizontal, 10)
                .padding(.vertical, 8)
            }
            footer
        }
        .frame(maxHeight: .infinity, alignment: .top)
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
    @State private var hovering = false
    @Environment(\.umbra) private var theme

    var body: some View {
        let p = theme.palette
        let active = selection == item.id
        let inside = selection.map(item.contains) ?? false
        VStack(alignment: .leading, spacing: 1) {
            Button {
                selection = item.id
            } label: {
                HStack(spacing: 9) {
                    if let symbol = item.symbol {
                        Image(systemName: symbol)
                            .font(.system(size: depth == 0 ? 13 : 12, weight: .medium))
                            .foregroundStyle(active ? p.accent : (item.tone?.color(p) ?? p.fg2))
                            .frame(width: 18)
                    }
                    Text(item.title)
                        .font(.system(size: 12.5, weight: active || inside ? .semibold : .medium))
                        .foregroundStyle(active ? p.fg : p.fg2)
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
                .padding(.leading, 8 + CGFloat(depth) * 18)
                .padding(.trailing, 8)
                .frame(height: 30)
                .background {
                    RoundedRectangle(cornerRadius: UmbraRadius.sm, style: .continuous)
                        .fill(active ? p.surface2 : (hovering ? p.surface1 : .clear))
                }
                .overlay(alignment: .leading) {
                    if active {
                        Capsule().fill(p.accent).frame(width: 3, height: 14).offset(x: -1)
                    }
                }
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .disabled(item.disabled)
            .opacity(item.disabled ? 0.4 : 1)
            .onHover { hovering = $0 }
            .accessibilityAddTraits(active ? .isSelected : [])

            if !item.children.isEmpty && (active || inside) {
                ForEach(item.children) { child in
                    AnyView(UmbraSidebarNode(item: child, depth: depth + 1, selection: $selection))
                }
            }
        }
    }
}

/// Host block on top of the sidebar: name, subtitle and a status dot.
public struct UmbraSidebarHost: View {
    private let name: String
    private let subtitle: String?
    private let status: UmbraTone
    @Environment(\.umbra) private var theme

    public init(_ name: String, subtitle: String? = nil, status: UmbraTone = .green) {
        self.name = name
        self.subtitle = subtitle
        self.status = status
    }

    public var body: some View {
        let p = theme.palette
        HStack(spacing: 10) {
            Image(systemName: "laptopcomputer")
                .font(.system(size: 14, weight: .medium))
                .foregroundStyle(p.fg2)
                .frame(width: 30, height: 30)
                .background(p.surface2, in: RoundedRectangle(cornerRadius: UmbraRadius.sm, style: .continuous))
            VStack(alignment: .leading, spacing: 1) {
                Text(name).font(.system(size: 12.5, weight: .semibold)).lineLimit(1)
                if let subtitle {
                    Text(subtitle).font(.system(size: 11)).foregroundStyle(p.fg3).lineLimit(1)
                }
            }
            Spacer(minLength: 0)
            UmbraDot(status, pulse: status == .green)
        }
        .padding(10)
        .umbraSurface(.panel)
        .padding(.horizontal, 10)
        .padding(.top, 4)
        .padding(.bottom, 6)
    }
}
