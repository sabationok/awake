import SwiftUI

/// An option of a segmented control or a select.
public struct Option<Value: Hashable>: Identifiable {
    public var value: Value
    public var label: String
    public var disabled: Bool
    public var id: Value { value }

    public init(_ value: Value, _ label: String, disabled: Bool = false) {
        self.value = value
        self.label = label
        self.disabled = disabled
    }
}

/// Segmented control (`.u-seg`): a borderless track (`segTrack`) with the selected segment as a thumb (`segThumb`,
/// shadow and ring from the palette). Inactive labels are `fg2`, `fg` on hover.
public struct Segmented<Value: Hashable>: View {
    @Binding private var selection: Value
    private let options: [Option<Value>]
    @Environment(\.umbra) private var theme
    @Namespace private var thumb
    @State private var hovered: Value?

    public init(selection: Binding<Value>, options: [Option<Value>]) {
        _selection = selection
        self.options = options
    }

    public var body: some View {
        let p = theme.palette
        HStack(spacing: 0) {
            ForEach(options) { option in
                let selected = option.value == selection
                Button {
                    selection = option.value
                } label: {
                    Text(option.label)
                        .font(.system(size: 12, weight: .medium))
                        .lineLimit(1)
                        .foregroundStyle(selected || hovered == option.value ? p.fg : p.fg2)
                        .padding(.horizontal, 14)
                        .frame(height: 28)
                        .background {
                            if selected {
                                RoundedRectangle(cornerRadius: 4, style: .continuous)
                                    .fill(p.segThumb)
                                    .overlay(RoundedRectangle(cornerRadius: 4, style: .continuous)
                                        .strokeBorder(p.segThumbRing, lineWidth: p.segThumbRingWidth))
                                    .shadow(color: p.segThumbShadow, radius: 1, y: 1)
                                    .matchedGeometryEffect(id: "thumb", in: thumb)
                            }
                        }
                        .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .onHover { inside in
                    if inside { hovered = option.value } else if hovered == option.value { hovered = nil }
                }
                .disabled(option.disabled)
                .accessibilityAddTraits(selected ? .isSelected : [])
            }
        }
        .padding(2)
        .background(p.segTrack, in: RoundedRectangle(cornerRadius: Radius.sm, style: .continuous))
        .animation(Motion.ease, value: selection)
    }
}
