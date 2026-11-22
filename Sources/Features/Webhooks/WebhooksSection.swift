import SwiftUI

/// «Вебхуки» на головній вкладці Webhooxy: список з SQLite агента, налаштування кожного — у модалці.
struct WebhooksSection: View {
    @EnvironmentObject private var model: AwakeModel
    /// Відкрита модалка: `.new` або наявний вебхук.
    @State private var editing: Editing?

    private enum Editing: Identifiable {
        case new
        case existing(AgentWebhook)

        var id: String {
            switch self {
            case .new: "new"
            case .existing(let webhook): "\(webhook.id)"
            }
        }
    }

    var body: some View {
        Section {
            if model.webhooks.isEmpty {
                Text(model.agentStatus.isRunning ? "Вебхуків ще немає." : "Агент не запущений.")
                    .foregroundStyle(.secondary)
            }
            ForEach(model.webhooks) { webhook in
                WebhookCard(webhook: webhook) { editing = .existing(webhook) }
            }
            HStack {
                Spacer()
                Button("Додати вебхук") { editing = .new }
                    .disabled(!model.agentStatus.isRunning)
            }
        } header: {
            Text("Вебхуки")
        } footer: {
            Text("Webhooxy реєструє вебхук сам на першому запиті, агент лише пам'ятає свої. Токен воркспейсу й ключ JWT спільні для всіх — у «Підключення» → «Ключі аппки».")
        }
        .sheet(item: $editing) { editing in
            switch editing {
            case .new: WebhookFormSheet(webhook: nil)
            case .existing(let webhook): WebhookFormSheet(webhook: webhook)
            }
        }
    }
}
