import SwiftUI

/// Typed toast (`.u-toast`). The consumer owns the queue; Umbra only draws it.
public struct Toast: Identifiable, Equatable {
    public enum Kind: String, CaseIterable { case info, success, warning, error }

    public var id: String
    public var kind: Kind
    public var title: String
    public var detail: String?
    /// Monospaced technical detail (an action id, an error code).
    public var code: String?

    public init(id: String = UUID().uuidString, kind: Kind, title: String, detail: String? = nil, code: String? = nil) {
        self.id = id
        self.kind = kind
        self.title = title
        self.detail = detail
        self.code = code
    }
}

public struct ToastView: View {
    private let toast: Toast
    @Environment(\.umbra) private var theme

    public init(_ toast: Toast) {
        self.toast = toast
    }

    public var body: some View {
        let p = theme.palette
        let tone: Color = switch toast.kind {
        case .info: p.accent
        case .success: p.ok
        case .warning: p.warn
        case .error: p.danger
        }
        let symbol = switch toast.kind {
        case .info: "info.circle"
        case .success: "checkmark.circle"
        case .warning: "exclamationmark.triangle"
        case .error: "exclamationmark.circle"
        }
        HStack(alignment: .top, spacing: 10) {
            Image(systemName: symbol).font(.system(size: 13, weight: .medium)).foregroundStyle(tone)
                .frame(width: 16, height: 16).padding(.top, 1)
            VStack(alignment: .leading, spacing: 2) {
                Text(toast.title).font(.system(size: 12, weight: .semibold)).foregroundStyle(p.fg)
                if let detail = toast.detail {
                    Text(detail).font(Font.xs).foregroundStyle(p.fg3)
                }
                if let code = toast.code {
                    Text(code).font(.system(size: 10.5, design: .monospaced)).foregroundStyle(p.fg3)
                }
            }
            .fixedSize(horizontal: false, vertical: true)
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 10)
        .frame(maxWidth: 380, alignment: .leading)
        .umbraSurface(.overlay)
        .overlay {
            if toast.kind == .error {
                RoundedRectangle(cornerRadius: Radius.md, style: .continuous).strokeBorder(p.danger.opacity(0.45))
            }
        }
        .accessibilityElement(children: .combine)
    }
}

/// Bottom-trailing stack of toasts; put it in an overlay of the window content.
public struct ToastStack: View {
    private let toasts: [Toast]

    public init(_ toasts: [Toast]) {
        self.toasts = toasts
    }

    public var body: some View {
        VStack(alignment: .trailing, spacing: 8) {
            ForEach(toasts) { toast in
                ToastView(toast)
                    .transition(.move(edge: .bottom).combined(with: .opacity))
            }
        }
        .padding(16)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottomTrailing)
        .animation(Motion.ease, value: toasts)
    }
}
