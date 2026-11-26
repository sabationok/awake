import SwiftUI

/// Сповіщення: info — акцент, warn — помаранчевий, error — червоний. Хрестик шле `dismiss`, рішення — за сервером.
struct UiNoticeView: View {
    let notice: UiNotice
    @EnvironmentObject private var model: AwakeModel

    private var color: Color {
        switch notice.variant {
        case .info: .accentColor
        case .warn: .orange
        case .error: .red
        }
    }

    var body: some View {
        HStack(alignment: .top, spacing: 8) {
            if let icon = notice.icon {
                Image(systemName: icon.symbol)
            }
            VStack(alignment: .leading, spacing: 2) {
                if let title = notice.title {
                    Text(title).fontWeight(.semibold)
                }
                Text(notice.text).fixedSize(horizontal: false, vertical: true)
            }
            Spacer(minLength: 8)
            if let dismiss = notice.dismiss {
                Button {
                    model.sendUiEvent(.action(dismiss))
                } label: {
                    Image(systemName: "xmark")
                }
                .buttonStyle(.borderless)
                .accessibilityLabel("Закрити")
            }
        }
        .font(.callout)
        .foregroundStyle(color)
        .padding(10)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(color.opacity(0.12), in: RoundedRectangle(cornerRadius: 8))
    }
}
