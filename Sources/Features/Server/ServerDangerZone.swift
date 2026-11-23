import SwiftUI

/// Небезпечна зона «Сервера»: зупинка й перезапуск обривають API, Web UI, Telegram і віддалений доступ для всіх
/// пристроїв, тож кожна дія питає підтвердження введеним словом.
struct ServerDangerZone: View {
    @EnvironmentObject private var model: AwakeModel
    @State private var pending: ServerDangerAction?

    var body: some View {
        Section {
            ForEach(ServerDangerAction.allCases) { action in
                SettingsRow(title: action.title, symbol: action.symbol, color: .red) {
                    Button(action.button, role: .destructive) { pending = action }
                }
            }
        } header: {
            Text("Небезпечна зона")
        } footer: {
            Text("Поки сервер зупинений, жоден пристрій не керує Mac: ні Web UI, ні Telegram, ні Tailscale.")
        }
        .sheet(item: $pending) { action in
            ServerDangerConfirmSheet(action: action) {
                switch action {
                case .stop: model.agentEnabled = false
                case .restart: model.restartAgent()
                }
            }
        }
    }
}

enum ServerDangerAction: String, CaseIterable, Identifiable {
    case restart, stop

    var id: String { rawValue }

    var title: String {
        switch self {
        case .restart: "Перезапустити сервер"
        case .stop: "Зупинити сервер"
        }
    }

    var button: String {
        switch self {
        case .restart: "Перезапустити…"
        case .stop: "Зупинити…"
        }
    }

    var symbol: String {
        switch self {
        case .restart: "arrow.clockwise"
        case .stop: "stop.fill"
        }
    }

    /// Слово, яке треба ввести для підтвердження.
    var word: String {
        switch self {
        case .restart: "перезапустити"
        case .stop: "зупинити"
        }
    }

    var warning: String {
        switch self {
        case .restart: "Сервер зупиниться і стартує знову. На кілька секунд обірвуться Web UI, Telegram і віддалений доступ."
        case .stop: "Сервер зупиниться і не стартує сам. Web UI, Telegram і віддалений доступ не працюватимуть, доки не натиснеш «Старт»."
        }
    }
}

/// Аркуш підтвердження: попередження і поле, куди треба ввести слово дії; кнопка активна лише після нього.
private struct ServerDangerConfirmSheet: View {
    let action: ServerDangerAction
    let confirm: () -> Void
    @Environment(\.dismiss) private var dismiss
    @State private var typed = ""

    private var matches: Bool {
        typed.trimmingCharacters(in: .whitespaces).lowercased() == action.word
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            Label(action.title, systemImage: "exclamationmark.triangle.fill")
                .font(.headline)
                .foregroundStyle(.red)
            Text(action.warning)
                .fixedSize(horizontal: false, vertical: true)
            Text("Щоб підтвердити, введи «\(action.word)»:")
                .foregroundStyle(.secondary)
            TextField(action.word, text: $typed)
                .textFieldStyle(.roundedBorder)
                .onSubmit { if matches { run() } }
            HStack {
                Spacer()
                Button("Скасувати", role: .cancel) { dismiss() }
                    .keyboardShortcut(.cancelAction)
                Button(action.button.replacingOccurrences(of: "…", with: ""), role: .destructive) { run() }
                    .disabled(!matches)
            }
        }
        .padding(20)
        .frame(width: 380)
    }

    private func run() {
        confirm()
        dismiss()
    }
}
