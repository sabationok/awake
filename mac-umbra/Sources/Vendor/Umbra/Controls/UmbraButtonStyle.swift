import SwiftUI

/// Button variants of `.u-btn`: accent (main action), default, ghost, warn, danger.
public enum UmbraButtonVariant: String, CaseIterable {
    case accent, `default`, ghost, warn, danger
}

public enum UmbraButtonSize {
    case regular, small
}

/// `Button("Увімкнути") { … }.buttonStyle(.umbra(.accent))`. Use `Label` for an icon.
public struct UmbraButtonStyle: ButtonStyle {
    public var variant: UmbraButtonVariant
    public var size: UmbraButtonSize

    public init(_ variant: UmbraButtonVariant = .default, size: UmbraButtonSize = .regular) {
        self.variant = variant
        self.size = size
    }

    public func makeBody(configuration: Configuration) -> some View {
        UmbraButtonBody(configuration: configuration, variant: variant, size: size)
    }
}

public extension ButtonStyle where Self == UmbraButtonStyle {
    static func umbra(_ variant: UmbraButtonVariant = .default, size: UmbraButtonSize = .regular) -> UmbraButtonStyle {
        UmbraButtonStyle(variant, size: size)
    }
}

private struct UmbraButtonBody: View {
    let configuration: ButtonStyle.Configuration
    let variant: UmbraButtonVariant
    let size: UmbraButtonSize
    @State private var hovering = false
    @Environment(\.isEnabled) private var isEnabled
    @Environment(\.umbra) private var theme

    var body: some View {
        let p = theme.palette
        let shape = RoundedRectangle(cornerRadius: UmbraRadius.sm, style: .continuous)
        let active = hovering || configuration.isPressed
        configuration.label
            .labelStyle(UmbraButtonLabelStyle())
            .font(.system(size: size == .small ? 11 : 12, weight: .semibold))
            .lineLimit(1)
            .padding(.horizontal, size == .small ? 10 : 14)
            .frame(height: size == .small ? 26 : 34)
            .foregroundStyle(foreground(p))
            .background(background(p, active: active), in: shape)
            .overlay(shape.strokeBorder(border(p), lineWidth: 1))
            .contentShape(shape)
            .opacity(isEnabled ? (configuration.isPressed ? 0.85 : 1) : 0.4)
            .onHover { hovering = $0 && isEnabled }
            .animation(.easeOut(duration: 0.15), value: active)
    }

    private func foreground(_ p: UmbraPalette) -> Color {
        switch variant {
        case .accent: p.accentInk
        case .default: p.fg
        case .ghost: hovering ? p.fg : p.fg2
        case .warn: p.orange
        case .danger: p.danger
        }
    }

    private func background(_ p: UmbraPalette, active: Bool) -> Color {
        switch variant {
        case .accent: active ? p.accent2 : p.accent
        case .default: active ? p.surface3 : p.surface2
        case .ghost: active ? p.surface1 : .clear
        case .warn: active ? p.orange.opacity(0.08) : .clear
        case .danger: active ? p.danger.opacity(0.08) : .clear
        }
    }

    private func border(_ p: UmbraPalette) -> Color {
        switch variant {
        case .accent, .ghost: .clear
        case .default: p.lineStrong
        case .warn: p.orange.opacity(0.4)
        case .danger: p.danger.opacity(0.35)
        }
    }
}

private struct UmbraButtonLabelStyle: LabelStyle {
    func makeBody(configuration: Configuration) -> some View {
        HStack(spacing: 7) {
            configuration.icon
                .font(.system(size: 11, weight: .semibold))
                .frame(width: 14, height: 14)
            configuration.title
        }
    }
}

/// Square icon-only button (`.u-icon-btn`). The label goes to help and accessibility.
public struct UmbraIconButton: View {
    private let symbol: String
    private let label: String
    private let action: () -> Void
    @State private var hovering = false
    @Environment(\.isEnabled) private var isEnabled
    @Environment(\.umbra) private var theme

    public init(_ symbol: String, label: String, action: @escaping () -> Void) {
        self.symbol = symbol
        self.label = label
        self.action = action
    }

    public var body: some View {
        let p = theme.palette
        Button(action: action) {
            Image(systemName: symbol)
                .font(.system(size: 14, weight: .medium))
                .frame(width: 30, height: 30)
                .foregroundStyle(hovering ? p.fg : p.fg2)
                .background(hovering ? p.surface2 : .clear, in: RoundedRectangle(cornerRadius: UmbraRadius.sm))
                .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .opacity(isEnabled ? 1 : 0.4)
        .onHover { hovering = $0 && isEnabled }
        .help(label)
        .accessibilityLabel(label)
    }
}
