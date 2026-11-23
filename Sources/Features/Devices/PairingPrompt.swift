import SwiftUI

/// «Це ви?» як у месенджерах: пристрій відсканував QR, і лише тут вирішують, чи дати йому доступ.
/// Аркуш, а не алерт: картка пристрою, окремо банер-попередження і підказка, кнопки внизу.
private struct PairingPrompt: ViewModifier {
    @EnvironmentObject private var model: AwakeModel

    func body(content: Content) -> some View {
        content.sheet(item: Binding(get: { model.pendingPairingRequest }, set: { _ in })) { request in
            PairingRequestSheet(request: request)
                .environmentObject(model)
                // Закрити можна лише відповіддю: запит без неї просто протухне.
                .interactiveDismissDisabled()
        }
    }
}

private struct PairingRequestSheet: View {
    @EnvironmentObject private var model: AwakeModel
    let request: AgentDevices.Request

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Сполучити пристрій?")
                .font(.title2.weight(.semibold))
            deviceCard
            PairingWarningBanner(text: request.via.warning)
            Text(request.via.hint)
                .font(.callout)
                .foregroundStyle(.secondary)
                .fixedSize(horizontal: false, vertical: true)
            HStack {
                PairingRequestCountdown(expiresAt: request.expiresAt)
                Spacer()
                Button("Відхилити") { model.answerPairing(request, approve: false) }
                    .keyboardShortcut(.cancelAction)
                // Запит не з цієї Wi-Fi може прийти звідки завгодно: Enter не має дозволяти його мимохідь.
                Button("Дозволити") { model.answerPairing(request, approve: true) }
                    .buttonStyle(.borderedProminent)
                    .keyboardShortcut(request.via == .local ? .defaultAction : nil)
            }
        }
        .padding(24)
        .frame(width: 420)
    }

    private var deviceCard: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 12) {
                Image(systemName: request.deviceSymbol)
                    .font(.system(size: 22))
                    .foregroundStyle(.white)
                    .frame(width: 40, height: 40)
                    .background(Color.accentColor.gradient, in: RoundedRectangle(cornerRadius: 9, style: .continuous))
                Text(request.name)
                    .font(.headline)
            }
            Divider()
            LabeledContent("Шлях", value: request.via.pathTitle)
            LabeledContent("Мережа", value: request.via.networkTitle)
            LabeledContent("Час", value: request.createdAt.formatted(date: .omitted, time: .shortened))
        }
        .padding(14)
        .background(.quaternary.opacity(0.5), in: RoundedRectangle(cornerRadius: 12, style: .continuous))
    }
}

/// Жовтий банер: що саме отримає пристрій після «Дозволити».
private struct PairingWarningBanner: View {
    let text: String

    var body: some View {
        HStack(alignment: .top, spacing: 10) {
            Image(systemName: "exclamationmark.triangle.fill")
                .foregroundStyle(.yellow)
            Text(text)
                .fixedSize(horizontal: false, vertical: true)
        }
        .padding(12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.yellow.opacity(0.15), in: RoundedRectangle(cornerRadius: 10, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 10, style: .continuous).strokeBorder(Color.yellow.opacity(0.4)))
    }
}

/// Скільки ще діє запит: після цього агент його прибере сам.
private struct PairingRequestCountdown: View {
    let expiresAt: Date

    var body: some View {
        TimelineView(.periodic(from: .now, by: 1)) { context in
            let left = max(0, Int(expiresAt.timeIntervalSince(context.date)))
            Text("Діє ще \(left / 60):\(String(format: "%02d", left % 60))")
                .font(.callout.monospacedDigit())
                .foregroundStyle(.secondary)
        }
    }
}

private extension AgentDevices.Request {
    /// Іконка за User-Agent: телефон, планшет чи комп'ютер.
    var deviceSymbol: String {
        let agent = (userAgent ?? name).lowercased()
        if agent.contains("iphone") || agent.contains("android") { return "iphone" }
        if agent.contains("ipad") { return "ipad" }
        return "laptopcomputer"
    }
}

private extension AgentDevices.Mode {
    var pathTitle: String {
        switch self {
        case .local: "Локально"
        case .tailnet: "Tailscale"
        case .remote: "Дистанційно (webhooxy)"
        }
    }

    var networkTitle: String {
        switch self {
        case .local: "твоя Wi-Fi"
        case .tailnet: "твій tailnet, лише твій логін"
        case .remote: "будь-яка, через Web UI"
        }
    }

    var warning: String {
        switch self {
        case .local: "Пристрій керуватиме Mac, поки той у довіреній Wi-Fi, доки його не відкличеш."
        case .tailnet: "Пристрій керуватиме Mac з будь-якої мережі, доки його не відкличеш."
        case .remote: "Пристрій керуватиме Mac через інтернет з будь-якої мережі, доки його не відкличеш."
        }
    }

    var hint: String {
        switch self {
        case .local: "Дозволяй, лише якщо щойно сам сканував QR вкладки «Локально». Якщо ні — відхили: без дозволу пристрій нічого не отримає."
        case .tailnet: "Дозволяй, лише якщо щойно сам сканував QR вкладки «Tailscale»."
        case .remote: "Дозволяй, лише якщо щойно сам сканував QR вкладки «Дистанційно»: запит міг прийти звідки завгодно."
        }
    }
}

extension View {
    func pairingPrompt() -> some View { modifier(PairingPrompt()) }
}
