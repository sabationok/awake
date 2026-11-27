import AppKit

/// A native confirm before a dangerous action (MVP; the Umbra dialog comes later).
enum Confirm {
    @MainActor
    static func ask(title: String, text: String?, ok: String = "Так") -> Bool {
        let alert = NSAlert()
        alert.messageText = title
        alert.informativeText = text ?? ""
        alert.addButton(withTitle: ok)
        alert.addButton(withTitle: "Скасувати")
        return alert.runModal() == .alertFirstButtonReturn
    }
}
