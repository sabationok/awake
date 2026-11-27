import SwiftUI

/// What the shell tells the header and content: whether the layout is compact and how to open the sidebar.
public struct UmbraShellContext {
    public var compact: Bool
    public var toggleSidebar: () -> Void
}

/// Adaptive window layout (`.s-shell`):
/// - wide (≥ 640 pt): sidebar column (232 pt, `.sidebar` material) and the content column side by side;
/// - compact: the sidebar slides over the content with a scrim; the header shows a burger.
/// Chrome B puts the header in the traffic-light row and starts the sidebar under the lights; chrome A keeps a
/// 28 pt transparent title bar above everything.
public struct UmbraShell<Sidebar: View, Header: View, Content: View>: View {
    private let chrome: UmbraWindowChrome
    private let glow: UmbraBackdrop.Glow
    private let sidebar: Sidebar
    private let header: (UmbraShellContext) -> Header
    private let content: (UmbraShellContext) -> Content
    @State private var sidebarOpen = false
    @Environment(\.umbra) private var theme
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    public init(chrome: UmbraWindowChrome = .unifiedToolbar, glow: UmbraBackdrop.Glow = .none,
                @ViewBuilder sidebar: () -> Sidebar,
                @ViewBuilder header: @escaping (UmbraShellContext) -> Header,
                @ViewBuilder content: @escaping (UmbraShellContext) -> Content) {
        self.chrome = chrome
        self.glow = glow
        self.sidebar = sidebar()
        self.header = header
        self.content = content
    }

    public var body: some View {
        GeometryReader { geo in
            let compact = geo.size.width < UmbraLayout.compactWidth
            let context = UmbraShellContext(compact: compact) {
                withAnimation(reduceMotion ? nil : UmbraMotion.ease) { sidebarOpen.toggle() }
            }
            ZStack(alignment: .topLeading) {
                UmbraBackdrop(glow: glow)
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
        .ignoresSafeArea()
        .umbraWindowChrome(chrome)
    }

    // MARK: columns

    private var sidebarColumn: some View {
        VStack(spacing: 0) {
            // The band where the traffic lights live; empty and draggable.
            UmbraWindowDragArea().frame(height: chrome.titlebarHeight)
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

    private func contentColumn(_ context: UmbraShellContext, leadingInset: CGFloat) -> some View {
        VStack(spacing: 0) {
            if chrome == .transparentTitlebar {
                UmbraWindowDragArea().frame(height: chrome.titlebarHeight)
            }
            header(context)
                .padding(.leading, 16 + leadingInset)
                .padding(.trailing, 16)
            Rectangle().fill(theme.palette.line).frame(height: 1)
            ScrollView {
                content(context)
                    .frame(maxWidth: UmbraLayout.contentMaxWidth, alignment: .topLeading)
                    .padding(.horizontal, context.compact ? 16 : 28)
                    .padding(.vertical, 22)
                    .frame(maxWidth: .infinity)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
    }

    private func compactLayout(_ context: UmbraShellContext) -> some View {
        // Chrome B: the header shares the row with the traffic lights, so it starts after them.
        let inset = chrome == .unifiedToolbar ? UmbraWindowChrome.trafficLightsWidth - 16 : 0
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
