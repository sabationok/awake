import AppKit
import SwiftUI

public extension View {
    /// Adds the dev indicator (spec §3). A no-op for `production` builds and for a nil build.
    func devIndicator(build: DevBuild?, preview: DevIndicatorPreview? = nil) -> some View {
        modifier(DevIndicatorModifier(build: build, preview: preview))
    }
}

struct DevIndicatorModifier: ViewModifier {
    let build: DevBuild?
    let preview: DevIndicatorPreview?

    @Environment(\.colorScheme) private var colorScheme
    @State private var prefs: DevIndicatorPrefs
    @State private var panelOpen: Bool
    @State private var dragOffset: CGSize = .zero
    @State private var escMonitor: Any?

    private let inset: CGFloat = 16
    private let buttonSize: CGFloat = 36

    init(build: DevBuild?, preview: DevIndicatorPreview?) {
        self.build = build
        self.preview = preview
        if let preview {
            _prefs = State(initialValue: DevIndicatorPrefs(mode: preview.mode))
            _panelOpen = State(initialValue: preview.panelOpen)
        } else {
            let stored = build.map { DevIndicatorPrefsStore.load(projectId: $0.project.id) } ?? DevIndicatorPrefs()
            _prefs = State(initialValue: stored)
            _panelOpen = State(initialValue: false)
        }
    }

    @ViewBuilder
    func body(content: Content) -> some View {
        if let build, build.showsIndicator {
            let palette = DevPalette(colorScheme)
            switch prefs.mode {
            case .floating:
                content
                    .overlay { floatingLayer(build: build, palette: palette) }
                    .onChange(of: panelOpen) { _, open in updateEscMonitor(open) }
                    .onAppear { if panelOpen { updateEscMonitor(true) } }
                    .onChange(of: prefs) { _, new in persist(new, build: build) }
            case .strip:
                content
                    .safeAreaInset(edge: .bottom, spacing: 0) {
                        DevStripBar(build: build, palette: palette) { panelOpen.toggle() }
                    }
                    .overlay { stripPanelLayer(build: build, palette: palette) }
                    .onChange(of: panelOpen) { _, open in updateEscMonitor(open) }
                    .onAppear { if panelOpen { updateEscMonitor(true) } }
                    .onChange(of: prefs) { _, new in persist(new, build: build) }
            }
        } else {
            content
        }
    }

    // MARK: Floating mode

    private func floatingLayer(build: DevBuild, palette: DevPalette) -> some View {
        GeometryReader { geo in
            let corner = prefs.corner
            ZStack(alignment: corner.alignment) {
                if panelOpen {
                    // Full-size dismiss layer: a click outside the panel closes it.
                    Color.clear
                        .contentShape(Rectangle())
                        .onTapGesture { panelOpen = false }
                }
                VStack(alignment: corner.isLeading ? .leading : .trailing, spacing: 8) {
                    if corner.isTop {
                        floatingButton(build: build, palette: palette, size: geo.size)
                        if panelOpen { panel(build: build, palette: palette) }
                    } else {
                        if panelOpen { panel(build: build, palette: palette) }
                        floatingButton(build: build, palette: palette, size: geo.size)
                    }
                }
                .padding(inset)
            }
            .frame(width: geo.size.width, height: geo.size.height, alignment: corner.alignment)
        }
    }

    private func floatingButton(build: DevBuild, palette: DevPalette, size: CGSize) -> some View {
        DevFloatingButton(build: build, palette: palette)
            .offset(dragOffset)
            .onTapGesture { panelOpen.toggle() }
            .gesture(
                DragGesture(minimumDistance: 4)
                    .onChanged { value in
                        panelOpen = false
                        dragOffset = value.translation
                    }
                    .onEnded { value in
                        let corner = prefs.corner
                        let anchorX = corner.isLeading ? inset + buttonSize / 2 : size.width - inset - buttonSize / 2
                        let anchorY = corner.isTop ? inset + buttonSize / 2 : size.height - inset - buttonSize / 2
                        let target = DevCorner.nearest(
                            x: anchorX + value.translation.width,
                            y: anchorY + value.translation.height,
                            in: size
                        )
                        withAnimation(.snappy(duration: 0.22)) {
                            prefs.corner = target
                            dragOffset = .zero
                        }
                    }
            )
    }

    // MARK: Strip mode

    private func stripPanelLayer(build: DevBuild, palette: DevPalette) -> some View {
        ZStack(alignment: .bottomLeading) {
            if panelOpen {
                Color.clear
                    .contentShape(Rectangle())
                    .onTapGesture { panelOpen = false }
                panel(build: build, palette: palette)
                    .padding(.leading, 8)
                    .padding(.bottom, 24 + 6)
            }
        }
    }

    // MARK: Shared

    private func panel(build: DevBuild, palette: DevPalette) -> some View {
        DevPanel(
            build: build,
            palette: palette,
            mode: prefs.mode,
            tools: DevTools.shared,
            onSelectMode: { mode in
                withAnimation(.snappy(duration: 0.2)) { prefs.mode = mode }
                panelOpen = false
            }
        )
    }

    private func persist(_ prefs: DevIndicatorPrefs, build: DevBuild) {
        guard preview == nil else { return }
        DevIndicatorPrefsStore.save(prefs, projectId: build.project.id)
    }

    /// Esc closes the open panel. The monitor lives only while the panel is open.
    private func updateEscMonitor(_ open: Bool) {
        if open, escMonitor == nil {
            escMonitor = NSEvent.addLocalMonitorForEvents(matching: .keyDown) { event in
                if event.keyCode == 53 {
                    panelOpen = false
                    return nil
                }
                return event
            }
        } else if !open, let monitor = escMonitor {
            NSEvent.removeMonitor(monitor)
            escMonitor = nil
        }
    }
}
