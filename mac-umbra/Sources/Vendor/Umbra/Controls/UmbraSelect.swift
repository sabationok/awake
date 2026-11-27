import SwiftUI

/// Select (`.u-select`): a raised field with a chevron; the options open in a themed popover list.
public struct UmbraSelect<Value: Hashable>: View {
    @Binding private var selection: Value
    private let options: [UmbraOption<Value>]
    private let label: String
    private let fullWidth: Bool
    @State private var open = false
    @Environment(\.isEnabled) private var isEnabled
    @Environment(\.umbra) private var theme

    public init(_ label: String, selection: Binding<Value>, options: [UmbraOption<Value>], fullWidth: Bool = false) {
        self.label = label
        _selection = selection
        self.options = options
        self.fullWidth = fullWidth
    }

    public var body: some View {
        let p = theme.palette
        let shape = RoundedRectangle(cornerRadius: UmbraRadius.sm, style: .continuous)
        Button {
            open.toggle()
        } label: {
            HStack(spacing: 8) {
                Text(options.first { $0.value == selection }?.label ?? "—")
                    .lineLimit(1)
                    .truncationMode(.tail)
                    .frame(maxWidth: fullWidth ? .infinity : 220, alignment: .leading)
                    .fixedSize(horizontal: !fullWidth, vertical: false)
                Image(systemName: "chevron.down")
                    .font(.system(size: 10, weight: .semibold))
                    .foregroundStyle(p.fg3)
                    .frame(width: 12, height: 12)
            }
            .font(.system(size: 12))
            .foregroundStyle(p.fg)
            .padding(.leading, 10)
            .padding(.trailing, 8)
            .frame(minHeight: fullWidth ? 36 : 30)
            .background(p.surface2, in: shape)
            .overlay(shape.strokeBorder(open ? p.accent : p.lineStrong, lineWidth: 1))
            .contentShape(shape)
        }
        .buttonStyle(.plain)
        .opacity(isEnabled ? 1 : 0.45)
        .accessibilityLabel(label)
        .popover(isPresented: $open, arrowEdge: .bottom) {
            UmbraMenuList {
                ForEach(options) { option in
                    UmbraMenuItemView(title: option.label,
                                      symbol: option.value == selection ? "checkmark" : nil,
                                      variant: nil, hint: nil, disabled: option.disabled) {
                        selection = option.value
                        open = false
                    }
                }
            }
            .umbraThemed(theme)
        }
    }
}

extension View {
    /// Popovers start a new environment; carry the theme into them.
    func umbraThemed(_ theme: UmbraTheme) -> some View {
        environment(\.umbra, theme)
            .preferredColorScheme(theme.scheme)
            .foregroundStyle(theme.palette.fg)
            .tint(theme.palette.accent)
    }
}
