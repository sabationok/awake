import SwiftUI

/// One breadcrumb. The last one is the current page and is not clickable.
public struct UmbraCrumb: Identifiable, Hashable {
    public var id: String
    public var title: String

    public init(id: String, title: String) {
        self.id = id
        self.title = title
    }
}

/// Page header (`.s-top`): title 18 pt semibold, crumbs 14 pt fg-3; burger (compact), back, crumbs, title, trailing actions. The whole empty band drags
/// the window, so it can replace the title bar (chrome B).
public struct UmbraHeader<Trailing: View>: View {
    private let title: String
    private let crumbs: [UmbraCrumb]
    private let onBack: (() -> Void)?
    private let onMenu: (() -> Void)?
    private let onCrumb: ((UmbraCrumb) -> Void)?
    private let chip: String?
    private let trailing: Trailing
    @Environment(\.umbra) private var theme

    public init(_ title: String, crumbs: [UmbraCrumb] = [], onBack: (() -> Void)? = nil,
                onMenu: (() -> Void)? = nil, onCrumb: ((UmbraCrumb) -> Void)? = nil, chip: String? = nil,
                @ViewBuilder trailing: () -> Trailing) {
        self.title = title
        self.chip = chip
        self.crumbs = crumbs
        self.onBack = onBack
        self.onMenu = onMenu
        self.onCrumb = onCrumb
        self.trailing = trailing()
    }

    public var body: some View {
        let p = theme.palette
        HStack(spacing: 6) {
            if let onMenu { UmbraIconButton("sidebar.left", label: "Меню", action: onMenu) }
            if let onBack { UmbraIconButton("chevron.left", label: "Назад", action: onBack) }
            HStack(spacing: 6) {
                ForEach(crumbs) { crumb in
                    Button(crumb.title) { onCrumb?(crumb) }
                        .buttonStyle(.plain)
                        .font(.system(size: 14))
                        .foregroundStyle(p.fg3)
                        .lineLimit(1)
                    Image(systemName: "chevron.right")
                        .font(.system(size: 10, weight: .semibold))
                        .foregroundStyle(p.fg3)
                        .frame(width: 14, height: 14)
                }
                Text(title)
                    .font(.system(size: 18, weight: .semibold))
                    .tracking(-0.18)
                    .lineLimit(1)
                // `.u-chip` right after the title (the page's scope, «лише в локальній мережі»).
                if let chip { UmbraChip(chip).padding(.leading, 4) }
            }
            .padding(.leading, onBack == nil && onMenu == nil ? 0 : 2)
            .layoutPriority(1)
            UmbraWindowDragArea().frame(maxWidth: .infinity, maxHeight: .infinity)
            trailing
        }
        .frame(height: UmbraLayout.headerHeight)
    }
}

public extension UmbraHeader where Trailing == EmptyView {
    init(_ title: String, crumbs: [UmbraCrumb] = [], onBack: (() -> Void)? = nil,
         onMenu: (() -> Void)? = nil, onCrumb: ((UmbraCrumb) -> Void)? = nil, chip: String? = nil) {
        self.init(title, crumbs: crumbs, onBack: onBack, onMenu: onMenu, onCrumb: onCrumb, chip: chip) { EmptyView() }
    }
}
