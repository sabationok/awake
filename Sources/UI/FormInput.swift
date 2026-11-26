import SwiftUI

/// Поле форми, як на вебі: підпис над полем, саме поле — з фоном і рамкою (у фокусі — акцентна), для пароля «око».
/// Під полем один рядок: помилка червоним або підказка. Місце під нього зарезервоване завжди, тож поява помилки
/// нічого не зсуває.
struct FormInput: View {
    let label: String
    @Binding var text: String
    var prompt: String?
    var secure = false
    var hint: String?
    var error: String?
    var onSubmit: () -> Void = {}

    @State private var revealed = false
    @FocusState private var focused: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: 5) {
            Text(label).font(.callout).foregroundStyle(.secondary)
            HStack(spacing: 6) {
                Group {
                    if secure && !revealed {
                        SecureField("", text: $text, prompt: prompt.map(Text.init))
                    } else {
                        TextField("", text: $text, prompt: prompt.map(Text.init))
                    }
                }
                .textFieldStyle(.plain)
                // Form вирівнює поля праворуч; тут текст і підказка — зліва, як на вебі.
                .multilineTextAlignment(.leading)
                .focused($focused)
                .onSubmit(onSubmit)
                if secure {
                    Button {
                        revealed.toggle()
                    } label: {
                        Image(systemName: revealed ? "eye.slash" : "eye").foregroundStyle(.secondary).frame(width: 18)
                    }
                    .buttonStyle(.borderless)
                    .help(revealed ? "Сховати" : "Показати")
                    .accessibilityLabel(revealed ? "Сховати" : "Показати")
                }
            }
            .padding(.horizontal, 10)
            .frame(height: 30)
            .background(Palette.segmentTrack.opacity(0.55), in: RoundedRectangle(cornerRadius: 7))
            .overlay(
                RoundedRectangle(cornerRadius: 7)
                    .strokeBorder(error != nil ? Color.red : (focused ? Color.accentColor : Palette.separator), lineWidth: focused || error != nil ? 1.5 : 1)
            )
            .contentShape(Rectangle())
            .onTapGesture { focused = true }
            // Рядок під полем є завжди: висота форми не стрибає, коли з'являється помилка.
            Text(error ?? hint ?? " ")
                .font(.caption)
                .foregroundStyle(error != nil ? Color.red : Color.secondary)
                .lineLimit(2, reservesSpace: true)
                .fixedSize(horizontal: false, vertical: true)
        }
    }
}
