import AppKit

/// The click of one Dock menu item. `NSMenuItem.target` is weak, so the item also keeps it as `representedObject`.
final class DockMenuAction: NSObject {
    private let run: () -> Void

    init(_ run: @escaping () -> Void) {
        self.run = run
    }

    @objc func perform(_ sender: Any?) {
        run()
    }

    func attach(to item: NSMenuItem) {
        item.target = self
        item.action = #selector(perform(_:))
        item.representedObject = self
    }
}
