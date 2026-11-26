import AppKit
import SwiftUI

/// «Сервер»: сам процес агента — стан, керування і порти. Звідки він віддає Web UI — на сторінці «Web UI». Навантаження й запити — у «Сервер → Статистика».
/// Що він робить (модулі, транспорти, журнал) — окремо, у «Агент».
struct ServerSection: View {
    @EnvironmentObject private var model: AwakeModel

    private var running: AgentServerInfo? { model.agentStatus.isRunning ? model.serverInfo : nil }

    var body: some View {
        Section {
            ItemCard(title: "Сервер", symbol: "server.rack", color: .indigo,
                     status: ItemCardStatus(label: model.agentStatus.statusText, color: statusColor, pulse: model.agentStatus.isRunning)) {
                ItemCardActions(actions: actions)
            } below: {
                if let info = running {
                    TimelineView(.periodic(from: .now, by: 30)) { context in
                        Text("працює \(Self.uptime(since: info.startedAt, now: context.date)) · pid \(info.pid) · \(info.node) · stage \(info.stage)")
                            .font(.callout)
                            .foregroundStyle(.secondary)
                    }
                }
            }
        } header: {
            Text("Стан")
        } footer: {
            // TODO(observability): живий потік логів, подій і помилок сервера в аппці з фільтрами, а не відкриття файлу.
            Text("Сервер — процес, який аппка запускає сама: API, Web UI і з'єднання. Що він робить (модулі, транспорти, журнал) — у «Агент». Лог поки що просто файл. Зупинка й перезапуск — у «Небезпечній зоні» внизу.")
        }

        if let info = running {
            Section("Порти") {
                ItemCard(title: "HTTPS", symbol: "lock.fill", color: .blue, comment: "\(info.ports.https) · Web UI напряму")
                ItemCard(title: "HTTP", symbol: "network", color: .blue,
                         comment: model.currentNetworkTrusted ? "\(info.ports.http) · видно в довіреній Wi-Fi" : "\(info.ports.http) · лише на цьому Mac")
                ItemCard(title: "Tailscale", symbol: "point.3.connected.trianglepath.dotted", color: .blue,
                         comment: "\(info.ports.tailnet) · лише 127.0.0.1, для serve")
            }
        }

        if model.agentEnabled {
            ServerDangerZone()
        }
    }

    /// «Старт», лише коли сервер вимкнено, і «Відкрити лог»: одна дія — кнопка, дві — меню «⋯».
    private var actions: [ItemCardActions.Action] {
        var list: [ItemCardActions.Action] = []
        if !model.agentEnabled {
            list.append(.init(id: "start", label: "Старт", symbol: "play.fill", prominent: true) { model.agentEnabled = true })
        }
        list.append(.init(id: "log", label: "Відкрити лог", symbol: "doc.text") { NSWorkspace.shared.open(AgentService.logURL) })
        return list
    }

    private var statusColor: Color {
        if case .failed = model.agentStatus { return .red }
        return model.agentStatus.isRunning ? .green : .secondary
    }

    private static func uptime(since start: Date, now: Date) -> String {
        let minutes = max(0, Int(now.timeIntervalSince(start) / 60))
        if minutes < 60 { return "\(minutes) хв" }
        let hours = minutes / 60
        return hours < 24 ? "\(hours) год \(minutes % 60) хв" : "\(hours / 24) д \(hours % 24) год"
    }
}
