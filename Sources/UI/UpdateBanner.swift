import SwiftUI

/// Кнопка внизу меню: з'являється, коли оновлення готове.
struct UpdateBanner: View {
    @ObservedObject var status: UpdateStatus

    var body: some View {
        if status.isReady {
            Button {
                status.installNow()
            } label: {
                HStack {
                    Text("Перезавантажити для оновлення")
                        .lineLimit(2)
                    Spacer(minLength: 6)
                    Image(systemName: "arrow.right")
                }
                .padding(10)
                .frame(maxWidth: .infinity, alignment: .leading)
            }
            .buttonStyle(.plain)
            .background(.quaternary, in: RoundedRectangle(cornerRadius: 8))
            .padding(10)
        }
    }
}
