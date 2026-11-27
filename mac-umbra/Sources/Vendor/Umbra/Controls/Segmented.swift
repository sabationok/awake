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

/// Segmented control (`.u-seg`): a track with the selected segment raised.
public struct Segmented<Value: Hashable>: View {
    @Binding private var selection: Value
    private let options: [Option<Value>]
    @Environment(\.umbra) private var theme
    @Namespace private var thumb

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
                        .foregroundStyle(selected ? p.fg : p.fg2)
                        .padding(.horizontal, 14)
                        .frame(height: 28)
                        .background {
                            if selected {
                                RoundedRectangle(cornerRadius: 4, style: .continuous)
                                    .fill(p.surface3)
                                    .matchedGeometryEffect(id: "thumb", in: thumb)
                            }
                        }
                        .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .disabled(option.disabled)
                .accessibilityAddTraits(selected ? .isSelected : [])
            }
        }
        .padding(2)
        .background(p.surface1, in: RoundedRectangle(cornerRadius: Radius.sm, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: Radius.sm, style: .continuous).strokeBorder(p.line))
        .animation(Motion.ease, value: selection)
    }
}
