import SwiftUI

/// «Це ви?» як у месенджерах: пристрій відсканував QR, і лише тут вирішують, чи дати йому доступ.
private struct PairingPrompt: ViewModifier {
    @EnvironmentObject private var model: AwakeModel

    func body(content: Content) -> some View {
        let request = model.pendingPairingRequest
        content.alert(
            "Сполучити «\(request?.name ?? "пристрій")»?",
            isPresented: Binding(get: { request != nil }, set: { _ in }),
            presenting: request
        ) { request in
            Button("Дозволити") { model.answerPairing(request, approve: true) }
                .keyboardShortcut(.defaultAction)
            Button("Відхилити", role: .cancel) { model.answerPairing(request, approve: false) }
        } message: { request in
            Text("Хтось у твоїй Wi-Fi щойно відкрив посилання з QR о \(request.createdAt.formatted(date: .omitted, time: .shortened)). Якщо це не ти — відхили: без дозволу пристрій не отримає доступу до пульта.")
        }
    }
}

extension View {
    func pairingPrompt() -> some View { modifier(PairingPrompt()) }
}
