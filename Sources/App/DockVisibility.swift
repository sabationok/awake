import AppKit

/// Іконка в Dock є лише поки відкрите вікно. Без вікна аппка живе тільки в меню-барі.
@MainActor
enum DockVisibility {
    /// Показати іконку в Dock і вивести аппку на передній план.
    static func show() {
        if NSApp.activationPolicy() != .regular {
            NSApp.setActivationPolicy(.regular)
        }
        NSApp.activate(ignoringOtherApps: true)
    }

    /// Сховати іконку, якщо не лишилося видимих звичайних вікон.
    static func hideIfNoWindows(except closing: NSWindow? = nil) {
        let hasWindows = NSApp.windows.contains { window in
            window !== closing && window.isVisible && window.canBecomeMain
        }
        if !hasWindows && NSApp.activationPolicy() != .accessory {
            NSApp.setActivationPolicy(.accessory)
        }
    }

    /// Стежить за закриттям і появою вікон.
    static func startObserving() {
        let center = NotificationCenter.default
        center.addObserver(forName: NSWindow.willCloseNotification, object: nil, queue: .main) { note in
            let window = note.object as? NSWindow
            MainActor.assumeIsolated { hideIfNoWindows(except: window) }
        }
        center.addObserver(forName: NSWindow.didBecomeKeyNotification, object: nil, queue: .main) { note in
            guard let window = note.object as? NSWindow, window.canBecomeMain else { return }
            MainActor.assumeIsolated { show() }
        }
    }
}
