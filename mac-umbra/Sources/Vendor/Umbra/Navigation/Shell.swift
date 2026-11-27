import SwiftUI

/// What the shell tells the header and content: whether the layout is compact and how to open the sidebar.
public struct ShellContext {
    public var compact: Bool
    public var toggleSidebar: () -> Void
}

/// Adaptive window layout (`.s-shell`):
/// - wide (≥ 640 pt): sidebar column (232 pt, `.sidebar` material) and the content column side by side;
/// - compact: the sidebar slides over the content with a scrim; the header shows a burger.
/// Chrome B puts the header in the traffic-light row and starts the sidebar under the lights; chrome A keeps a
/// 28 pt transparent title bar above everything.
/// Content column as `.s-main`: the header band (`.s-top`, 28 pt sides, no rule under it), an optional full-width
/// `bar` under it (`.s-tabs`: page NavTabs), then the scrolling content (`.s-content`: 22 / 28 pt padding, at most
/// 760 pt wide INCLUDING the padding, centred in the column: `margin-inline: auto`).
public struct Shell<Sidebar: View, Header: View, Bar: View, Content: View>: View {
    private let chrome: WindowChrome
    private let glow: Backdrop.Glow
    private let sidebar: Sidebar
    private let header: (ShellContext) -> Header
    private let bar: (ShellContext) -> Bar
    private let content: (ShellContext) -> Content
    @State private var sidebarOpen = false
    @Environment(\.umbra) private var theme
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    public init(chrome: WindowChrome = .unifiedToolbar, glow: Backdrop.Glow = .none,
                @ViewBuilder sidebar: () -> Sidebar,
                @ViewBuilder header: @escaping (ShellContext) -> Header,
                @ViewBuilder bar: @escaping (ShellContext) -> Bar,
                @ViewBuilder content: @escaping (ShellContext) -> Content) {
        self.chrome = chrome
        self.glow = glow
        self.sidebar = sidebar()
        self.header = header
        self.bar = bar
        self.content = content
    }

    public var body: some View {
        GeometryReader { geo in
            let compact = geo.size.width < UmbraLayout.compactWidth
            let context = ShellContext(compact: compact) {
                withAnimation(reduceMotion ? nil : Motion.ease) { sidebarOpen.toggle() }
            }
            ZStack(alignment: .topLeading) {
                Backdrop(glow: glow)
                if compact {
                    compactLayout(context)
                } else {
                    HStack(spacing: 0) {
                        sidebarColumn
                        Rectangle().fill(theme.palette.line).frame(width: 1)
                        contentColumn(context, leadingInset: 0)
                    }
                }
            }
            .onChange(of: compact) { _, isCompact in if !isCompact { sidebarOpen = false } }
        }
        // Only the title bar: a bottom inset (e.g. the dev indicator strip) must push the shell up, not sit over it.
        .ignoresSafeArea(edges: .top)
        .umbraWindowChrome(chrome)
    }

    // MARK: columns

    private var sidebarColumn: some View {
        VStack(spacing: 0) {
            // The band where the traffic lights live; empty and draggable.
            WindowDragArea().frame(height: chrome.titlebarHeight)
            sidebar
        }
        .frame(width: UmbraLayout.sidebarWidth)
        .frame(maxHeight: .infinity)
        .background {
            if theme.translucent {
                UmbraVisualEffect(.sidebar).overlay(theme.palette.bgApp.opacity(0.35))
            } else {
                theme.palette.bgApp
            }
        }
    }

    private func contentColumn(_ context: ShellContext, leadingInset: CGFloat) -> some View {
        VStack(spacing: 0) {
            if chrome == .transparentTitlebar {
                WindowDragArea().frame(height: chrome.titlebarHeight)
            }
            let side: CGFloat = context.compact ? 16 : 28
            header(context)
                .padding(.leading, side + leadingInset)
                .padding(.trailing, side)
            bar(context)
                .padding(.horizontal, side)
            ScrollView {
                content(context)
                    .frame(maxWidth: .infinity, alignment: .topLeading)
                    .padding(.horizontal, side)
                    .padding(.top, context.compact ? 16 : 22)
                    .padding(.bottom, context.compact ? 56 : 64)
                    .frame(maxWidth: UmbraLayout.contentMaxWidth, alignment: .topLeading)
                    .frame(maxWidth: .infinity, alignment: .center)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
    }

    private func compactLayout(_ context: ShellContext) -> some View {
        // Chrome B: the header shares the row with the traffic lights, so it starts after them.
        let inset = chrome == .unifiedToolbar ? max(WindowChrome.trafficLightsWidth - 16, 0) : 0
        return ZStack(alignment: .leading) {
            contentColumn(context, leadingInset: inset)
            if sidebarOpen {
                theme.palette.scrim
                    .ignoresSafeArea()
                    .onTapGesture { context.toggleSidebar() }
                    .transition(.opacity)
                sidebarColumn
                    .overlay(alignment: .trailing) { Rectangle().fill(theme.palette.lineStrong).frame(width: 1) }
                    .shadow(color: theme.palette.shadow, radius: 24, x: 8)
                    .transition(.move(edge: .leading))
            }
        }
    }
}

public extension Shell where Bar == EmptyView {
    init(chrome: WindowChrome = .unifiedToolbar, glow: Backdrop.Glow = .none,
         @ViewBuilder sidebar: () -> Sidebar,
         @ViewBuilder header: @escaping (ShellContext) -> Header,
         @ViewBuilder content: @escaping (ShellContext) -> Content) {
        self.init(chrome: chrome, glow: glow, sidebar: sidebar, header: header, bar: { _ in EmptyView() },
                  content: content)
    }
}
