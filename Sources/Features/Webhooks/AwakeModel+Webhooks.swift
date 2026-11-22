import Foundation

/// Вебхуки живуть у SQLite агента: аппка шле дію, а новий список приходить у `webhooks`.
extension AwakeModel {
    private struct Save: Encodable {
        let action = "save"
        let webhook: WebhookInput
    }

    private struct Change: Encodable {
        let action: String
        let id: Int
    }

    func saveWebhook(_ input: WebhookInput) {
        agent.send(type: "webhooks", data: Save(webhook: input))
        append("Вебхук \(input.type.title) збережено")
    }

    func setWebhookEnabled(_ id: Int, _ enabled: Bool) {
        agent.send(type: "webhooks", data: Change(action: enabled ? "enable" : "disable", id: id))
    }

    /// Період графіків карток: агент шле новий знімок вебхуків з графіками цього періоду.
    func requestWebhookCharts(_ period: StatsPeriod) {
        struct Period: Encodable {
            let action = "period"
            let period: StatsPeriod
        }
        agent.send(type: "webhooks", data: Period(period: period))
    }

    func deleteWebhook(_ id: Int) {
        agent.send(type: "webhooks", data: Change(action: "delete", id: id))
    }
}
