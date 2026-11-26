import SwiftUI

/// Заставка вікна, поки сервер піднімається і ще не дав актуальний інтерфейс. Під нею вже лежить дерево з кешу:
/// щойно приходить свіже, вікно перемальовується, кеш оновлюється і заставка зникає.
struct SplashView: View {
    let status: AgentService.Status
    /// Сервер не піднявся: власник може відкрити вікно без нього, щоб дістатись до «Підключення».
    let onSkip: () -> Void

    var body: some View {
        VStack(spacing: 14) {
            Image(nsImage: NSApp.applicationIconImage)
                .resizable()
                .frame(width: 84, height: 84)
            Text("MaControl").font(.title2.weight(.semibold))
            if case .failed(let message) = status {
                Label("Сервер не запустився", systemImage: "exclamationmark.triangle.fill")
                    .foregroundStyle(.orange)
                Text(message)
                    .font(.callout)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
                Button("Відкрити без сервера", action: onSkip)
            } else {
                ProgressView().controlSize(.small)
                Text(caption).font(.callout).foregroundStyle(.secondary)
            }
        }
        .padding(32)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(.regularMaterial)
    }

    private var caption: String {
        switch status {
        case .running: "Завантажую інтерфейс…"
        default: "Запускаю сервер…"
        }
    }
}
