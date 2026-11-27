import AppKit
import SwiftUI

/// Хедер вікна на всю ширину, незалежний від сайдбару і сторінки: три слоти — ліворуч (кнопка меню, назва чи
/// крихти), по центру і праворуч (майбутні компоненти: пошук, стан, дії). Над колонкою сайдбару — його матеріал і
/// кнопки вікна, над сторінкою — її фон і слоти. Лежить під прозорою компактною панеллю заголовка (WindowChrome):
/// кнопки вікна по її центру, на одній лінії з хедером. За порожнє місце вікно тягнеться.
struct AppHeader<Leading: View, Center: View, Trailing: View>: View {
    /// Ширина колонки сайдбару під хедером (0 — сайдбару немає, вузьке вікно): над нею матеріал сайдбару, над
    /// рештою — фон сторінки, слоти починаються з колонки сторінки.
    var sidebarWidth: CGFloat = 0
    @ViewBuilder var leading: () -> Leading
    @ViewBuilder var center: () -> Center
    @ViewBuilder var trailing: () -> Trailing

    /// Місце під кнопки вікна (закрити, згорнути, на весь екран).
    static var trafficLightsInset: CGFloat { 78 }
    /// Висота компактної уніфікованої панелі заголовка: кнопки вікна по її центру.
    static var height: CGFloat { 38 }

    var body: some View {
        HStack(spacing: 0) {
            if sidebarWidth > 0 {
                // Продовження сайдбару вгору: тут лише кнопки вікна.
                Rectangle().fill(.regularMaterial).frame(width: sidebarWidth)
                Divider()
            }
            ZStack {
                HStack(spacing: 10) {
                    leading()
                    Spacer(minLength: 12)
                    trailing()
                }
                center()
            }
            .padding(.leading, sidebarWidth > 0 ? 20 : Self.trafficLightsInset)
            .padding(.trailing, 14)
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(Palette.content)
        }
        .frame(height: Self.height)
        .frame(maxWidth: .infinity)
        .background(WindowDragArea())
        .overlay(alignment: .bottom) { Divider() }
        .background(WindowChrome())
    }
}

/// Налаштовує вікно під власний хедер: вміст під заголовком (fullSizeContentView), заголовок прозорий і без тексту,
/// порожній компактний уніфікований тулбар — від нього смуга заголовка 38 pt і кнопки вікна по її центру. Елементів у тулбарі
/// немає, тож macOS нічого в ньому не малює.
private struct WindowChrome: NSViewRepresentable {
    func makeNSView(context: Context) -> NSView {
        let view = NSView()
        DispatchQueue.main.async { configure(view.window) }
        return view
    }

    func updateNSView(_ nsView: NSView, context: Context) {
        DispatchQueue.main.async { configure(nsView.window) }
    }

    /// Щоразу, бо SwiftUI при оновленні сцени повертає видимий заголовок.
    private func configure(_ window: NSWindow?) {
        guard let window else { return }
        if !window.styleMask.contains(.fullSizeContentView) { window.styleMask.insert(.fullSizeContentView) }
        if !window.titlebarAppearsTransparent { window.titlebarAppearsTransparent = true }
        if window.titleVisibility != .hidden { window.titleVisibility = .hidden }
        if window.toolbar == nil { window.toolbar = NSToolbar(identifier: "MaControl.header") }
        if window.toolbarStyle != .unifiedCompact { window.toolbarStyle = .unifiedCompact }
    }
}

extension AppHeader where Center == EmptyView, Trailing == EmptyView {
    init(sidebarWidth: CGFloat = 0, @ViewBuilder leading: @escaping () -> Leading) {
        self.init(sidebarWidth: sidebarWidth, leading: leading, center: { EmptyView() }, trailing: { EmptyView() })
    }
}

/// Порожнє місце хедера тягне вікно, як системний заголовок.
private struct WindowDragArea: NSViewRepresentable {
    final class DragView: NSView {
        override var mouseDownCanMoveWindow: Bool { true }
    }

    func makeNSView(context: Context) -> NSView { DragView() }
    func updateNSView(_ nsView: NSView, context: Context) {}
}
