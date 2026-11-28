import AppKit

/// The app's Dock menu (right click on the Dock icon), asked synchronously by `applicationDockMenu(_:)`.
/// The top section «Інфо» is the app's own: the build passport and whether the server answers. The module sections
/// come from the server page `dock` (`ServerConnection.dockLayout`) with the app's AppState copy, as any page:
/// a section → its title as a header, `timer` / `row` → a disabled line, a button → an item sending the same action
/// a page button sends, or opening its `href` in the browser (a link button). The app decides nothing about what is
/// in them.
@MainActor
enum DockMenu {
    static let pageId = "dock"

    static func build(server: ServerConnection, build: DevBuild?) -> NSMenu {
        let menu = NSMenu()
        menu.autoenablesItems = false
        menu.addItem(.sectionHeader(title: "Інфо"))
        infoLines(server: server, build: build).forEach { menu.addItem(line($0)) }
        guard server.connected, let layout = server.dockLayout,
              let nodes = try? layout.renderNodes(state: server.appState) else { return menu }
        for node in nodes {
            guard case .section(let section) = node else { continue }
            let items = section.children.flatMap { self.items($0, server: server) }
            guard !items.isEmpty else { continue }
            menu.addItem(.separator())
            if let title = section.title { menu.addItem(.sectionHeader(title: title)) }
            items.forEach(menu.addItem)
        }
        return menu
    }

    private static func infoLines(server: ServerConnection, build: DevBuild?) -> [String] {
        var lines: [String] = []
        if let build {
            // The app is always «MaControl»: a non-production build is told apart by the icon badge and this line.
            if build.stage != .production { lines.append("Збірка \(stageLabel(build.stage))") }
            lines.append("Версія \(build.version) · \(build.git.commit.prefix(7))")
            lines.append("Зібрано \(build.builtAtLabel)")
        } else if let version = Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String {
            lines.append("Версія \(version)")
        }
        lines.append(server.connected ? "Сервер активний" : "Сервер недоступний")
        return lines
    }

    private static func stageLabel(_ stage: DevStage) -> String {
        switch stage {
        case .dev: "Dev"
        case .preview: "Preview"
        case .production: "Production"
        }
    }

    private static func items(_ node: UiNode, server: ServerConnection) -> [NSMenuItem] {
        switch node {
        case .timer(let timer):
            return [line(timerText(timer))]
        case .row(let row):
            return [line([row.label, row.value].compactMap { $0 }.joined(separator: " · "))]
        case .buttons(_, let buttons):
            return buttons.map { button(fromButton($0), disabled: $0.disabled ?? false || ($0.action == nil && $0.link == nil), server: server) }
        default:
            return []
        }
    }

    /// «Не спить до 14:30» while the end is known (from state), else the timer's text («Не спить»).
    private static func timerText(_ timer: UiTimer) -> String {
        guard let until = timer.until else { return timer.value }
        let formatter = DateFormatter()
        formatter.dateFormat = "HH:mm"
        return "\(timer.untilCaption ?? timer.value) \(formatter.string(from: until))"
    }

    private static func line(_ title: String) -> NSMenuItem {
        let item = NSMenuItem(title: title, action: nil, keyEquivalent: "")
        item.isEnabled = false
        return item
    }

    private static func button(_ runnable: RunnableAction, disabled: Bool, server: ServerConnection) -> NSMenuItem {
        let item = NSMenuItem(title: runnable.label, action: nil, keyEquivalent: "")
        item.isEnabled = !disabled
        DockMenuAction { [weak server] in
            // A link button (Web UI) opens the browser; the server gets nothing.
            if let link = runnable.link {
                NSWorkspace.shared.open(link)
                return
            }
            guard let server, let action = runnable.action else { return }
            if let confirm = runnable.confirm, !confirmed(confirm) { return }
            server.send(.action(action))
        }.attach(to: item)
        return item
    }

    /// A button with a confirm asks with a plain alert: the Dock menu has no window for the page's dialog.
    private static func confirmed(_ confirm: UiConfirm) -> Bool {
        let alert = NSAlert()
        alert.messageText = confirm.title
        alert.informativeText = confirm.text
        alert.addButton(withTitle: confirm.ok)
        alert.addButton(withTitle: "Скасувати")
        NSApp.activate(ignoringOtherApps: true)
        return alert.runModal() == .alertFirstButtonReturn
    }
}
