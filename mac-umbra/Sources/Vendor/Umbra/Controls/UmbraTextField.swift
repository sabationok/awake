import SwiftUI

/// Field (`.u-field` + `.u-input`): small label above, inset input, hint or error below.
public struct UmbraTextField: View {
    private let label: String
    @Binding private var text: String
    private let placeholder: String
    private let hint: String?
    private let error: String?
    private let secure: Bool
    @FocusState private var focused: Bool
    @Environment(\.umbra) private var theme

    public init(_ label: String, text: Binding<String>, placeholder: String = "", hint: String? = nil,
                error: String? = nil, secure: Bool = false) {
        self.label = label
        _text = text
        self.placeholder = placeholder
        self.hint = hint
        self.error = error
        self.secure = secure
    }

    public var body: some View {
        let p = theme.palette
        let shape = RoundedRectangle(cornerRadius: Radius.sm, style: .continuous)
        let border = error != nil ? p.danger : focused ? p.accent : p.lineStrong
        VStack(alignment: .leading, spacing: 6) {
            Text(label).font(UmbraFont.xs).foregroundStyle(p.fg3)
            Group {
                if secure {
                    SecureField(placeholder, text: $text)
                } else {
                    TextField(placeholder, text: $text)
                }
            }
            .textFieldStyle(.plain)
            .font(.system(size: 12))
            .focused($focused)
            .padding(.horizontal, 12)
            .frame(height: 36)
            .background(p.bgApp, in: shape)
            .overlay(shape.strokeBorder(border, lineWidth: 1))
            .background(shape.stroke(focused && error == nil ? p.accentSoft : .clear, lineWidth: 6))
            if let note = error ?? hint {
                Text(note).font(UmbraFont.xs).foregroundStyle(error != nil ? p.danger : p.fg3)
            }
        }
    }
}
