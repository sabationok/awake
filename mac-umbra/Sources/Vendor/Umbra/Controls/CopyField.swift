import AppKit
import SwiftUI

/// Copy field (`.u-copy`): monospaced value in an inset well with a copy button. «Скопійовано» shows for 1.5 s.
/// By default copies to the general pasteboard; pass `onCopy` to handle it yourself.
public struct CopyField: View {
    private let value: String
    private let caption: String?
    private let copiedText: String
    private let onCopy: ((String) -> Void)?
    @State private var copied = false
    @Environment(\.umbra) private var theme

    public init(_ value: String, caption: String? = nil, copiedText: String = "Скопійовано",
                onCopy: ((String) -> Void)? = nil) {
        self.value = value
        self.caption = caption
        self.copiedText = copiedText
        self.onCopy = onCopy
    }

    public var body: some View {
        let p = theme.palette
        HStack(spacing: 8) {
            Text(value)
                .font(Font.mono)
                .foregroundStyle(p.fg2)
                .lineLimit(1)
                .truncationMode(.middle)
                .textSelection(.enabled)
                .frame(maxWidth: .infinity, alignment: .leading)
            if let caption = copied ? copiedText : caption {
                Text(caption).font(Font.xs).foregroundStyle(copied ? p.ok : p.fg3)
            }
            IconButton(copied ? "checkmark" : "doc.on.doc", label: "Скопіювати") { copy() }
        }
        .padding(.leading, 10)
        .padding(.trailing, 2)
        .padding(.vertical, 2)
        .background(p.bgApp, in: RoundedRectangle(cornerRadius: Radius.sm, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: Radius.sm, style: .continuous).strokeBorder(p.line))
    }

    private func copy() {
        if let onCopy {
            onCopy(value)
        } else {
            NSPasteboard.general.clearContents()
            NSPasteboard.general.setString(value, forType: .string)
        }
        copied = true
        Task { @MainActor in
            try? await Task.sleep(for: .seconds(1.5))
            copied = false
        }
    }
}
