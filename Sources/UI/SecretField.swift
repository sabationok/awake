import SwiftUI

/// Поле для секрету (токен, ключ): крапки замість тексту, «око» поруч показує вписане.
/// Стан показу живе в полі: після виходу з екрана секрет знову прихований.
struct SecretField: View {
    @Binding var text: String
    var prompt: String = ""
    @State private var revealed = false

    var body: some View {
        HStack(spacing: 6) {
            Group {
                if revealed {
                    TextField("", text: $text, prompt: Text(prompt))
                } else {
                    SecureField("", text: $text, prompt: Text(prompt))
                }
            }
            .multilineTextAlignment(.trailing)
            Button {
                revealed.toggle()
            } label: {
                Image(systemName: revealed ? "eye.slash" : "eye")
                    .foregroundStyle(.secondary)
                    .frame(width: 18)
            }
            .buttonStyle(.borderless)
            .help(revealed ? "Сховати" : "Показати")
            .accessibilityLabel(revealed ? "Сховати" : "Показати")
        }
    }
}
