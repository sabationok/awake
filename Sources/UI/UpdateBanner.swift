import SwiftUI

/// Кнопка внизу меню: з'являється, коли оновлення готове. Лише каже, що воно є; що буде далі — у модалці.
struct UpdateBanner: View {
    @ObservedObject var status: UpdateStatus
    @EnvironmentObject private var model: AwakeModel

    var body: some View {
        if status.isReady {
            Button {
                status.confirmInstall(session: model.activeSessionName)
            } label: {
                HStack {
                    Text("Доступне оновлення")
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
