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
            // Дистанційний запит може прийти звідки завгодно: Enter не має дозволяти його мимохідь.
            Button("Дозволити") { model.answerPairing(request, approve: true) }
                .keyboardShortcut(request.via == .remote ? nil : .defaultAction)
            Button("Відхилити", role: .cancel) { model.answerPairing(request, approve: false) }
        } message: { request in
            Text(Self.message(request))
        }
    }
}

private extension PairingPrompt {
    static func message(_ request: AgentDevices.Request) -> String {
        let time = request.createdAt.formatted(date: .omitted, time: .shortened)
        switch request.via {
        case .local:
            return "Хтось у твоїй Wi-Fi щойно відкрив локальне посилання з QR о \(time). Якщо це не ти — відхили: без дозволу пристрій не отримає доступу до пульта."
        case .tailnet:
            return "Запит через Tailscale о \(time) з пристрою у твоєму tailnet (лише твій логін). Дозволяй, якщо щойно сам сканував QR вкладки Tailscale: пристрій керуватиме Mac з будь-якої мережі, доки його не відкличеш."
        case .remote:
            return "Дистанційний запит через інтернет (дашборд і relay) о \(time): пристрій може бути в будь-якій мережі. Дозволяй, лише якщо щойно сам сканував дистанційний QR. Після дозволу він керуватиме Mac звідусіль, доки його не відкличеш."
        }
    }
}

extension View {
    func pairingPrompt() -> some View { modifier(PairingPrompt()) }
}
