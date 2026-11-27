import SwiftUI

/// Tabs (`.s-tabs`): 13.5 pt text tabs, 22 pt apart, fg-3 / fg when active, with a 2 pt accent underline under the active one and a hairline under the row.
public struct UmbraTabs<Value: Hashable>: View {
    @Binding private var selection: Value
    private let options: [UmbraOption<Value>]
    @Namespace private var underline
    @Environment(\.umbra) private var theme

    public init(selection: Binding<Value>, options: [UmbraOption<Value>]) {
        _selection = selection
        self.options = options
    }

    public var body: some View {
        let p = theme.palette
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 22) {
                ForEach(options, id: \.value) { option in
                    let active = option.value == selection
                    Button {
                        withAnimation(UmbraMotion.ease) { selection = option.value }
                    } label: {
                        Text(option.label)
                            .font(.system(size: 13.5))
                            .foregroundStyle(active ? p.fg : p.fg3)
                            .padding(.top, 10).padding(.bottom, 12)
                            .overlay(alignment: .bottom) {
                                if active {
                                    RoundedRectangle(cornerRadius: 1).fill(p.accent).frame(height: 2)
                                        .matchedGeometryEffect(id: "underline", in: underline)
                                }
                            }
                            .contentShape(Rectangle())
                    }
                    .buttonStyle(.plain)
                    .disabled(option.disabled)
                    .opacity(option.disabled ? 0.4 : 1)
                    .accessibilityAddTraits(active ? .isSelected : [])
                }
            }
            .padding(.horizontal, 2)
        }
        .overlay(alignment: .bottom) { Rectangle().fill(p.line).frame(height: 1) }
    }
}
