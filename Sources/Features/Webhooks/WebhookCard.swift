import SwiftUI

/// Картка вебхука в списку: тип, режим, DEST, стан (лише relay) і лічильники. Налаштування — у модалці.
struct WebhookCard: View {
    @EnvironmentObject private var model: AwakeModel
    let webhook: AgentWebhook
    let onEdit: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 10) {
                SettingsIcon(symbol: webhook.type.symbol, color: webhook.isEnabled ? .accentColor : .gray)
                VStack(alignment: .leading, spacing: 2) {
                    Text(webhook.type.title).font(.headline)
                    Text("\(webhook.provider.rawValue) · \(webhook.mode.rawValue)")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                Spacer()
                if let status = webhook.status {
                    HStack(spacing: 6) {
                        StatusDot(color: statusColor(status), pulse: status == "connecting")
                        Text(statusText(status)).foregroundStyle(.secondary)
                    }
                } else if !webhook.isEnabled {
                    Text("вимкнений").foregroundStyle(.secondary)
                }
            }
            LabeledContent("DEST", value: "\(webhook.workspace) / \(webhook.destId)")
            if let room = webhook.config.room {
                LabeledContent("Room", value: room)
            }
            LabeledContent("ID", value: webhook.whId)
            if !metricRows.isEmpty {
                ForEach(metricRows, id: \.key) { row in
                    LabeledContent(row.label, value: row.value)
                }
            }
            HStack {
                Spacer()
                Button(webhook.isEnabled ? "Вимкнути" : "Увімкнути") { model.setWebhookEnabled(webhook.id, !webhook.isEnabled) }
                Button("Налаштувати", action: onEdit)
            }
        }
        .font(.callout)
        .padding(.vertical, 4)
    }

    /// Лічильники сьогодні / усього; ключі без підпису показуються як є.
    private var metricRows: [(key: String, label: String, value: String)] {
        webhook.metrics.total.keys.sorted().map { key in
            (key, Self.metricLabels[key] ?? key, "\(webhook.metrics.today[key] ?? 0) / \(webhook.metrics.total[key] ?? 0)")
        }
    }

    private static let metricLabels = [
        "relay.connects": "Підключень",
        "relay.messages": "Повідомлень",
        "relay.viewerAllowed": "Viewer-ів пущено",
        "relay.viewerDenied": "Viewer-ів не пущено",
        "relay.errors": "Помилок",
    ]

    private func statusText(_ status: String) -> String {
        switch status {
        case "online": "підключений"
        case "connecting": "підключається"
        case "offline": "не підключений"
        case "unconfigured": "бракує ключів"
        default: webhook.isEnabled ? "вимкнений перемикачем" : "вимкнений"
        }
    }

    private func statusColor(_ status: String) -> Color {
        switch status {
        case "online": .green
        case "connecting": .orange
        case "offline", "unconfigured": .red
        default: .gray
        }
    }
}
