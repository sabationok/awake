import AppKit
import SwiftUI

/// «Сервер»: сам процес агента — стан, керування і порти. Звідки він віддає Web UI — на сторінці «Web UI». Навантаження й запити — у «Сервер → Статистика».
/// Що він робить (модулі, транспорти, журнал) — окремо, у «Агент».
struct ServerSection: View {
    @EnvironmentObject private var model: AwakeModel

    private var running: AgentServerInfo? { model.agentStatus.isRunning ? model.serverInfo : nil }

    var body: some View {
        Section {
            SettingsRow(title: "Стан", symbol: "server.rack", color: .indigo) {
                Text(model.agentStatus.statusText).foregroundStyle(statusColor)
            }
            if let info = running {
                SettingsRow(title: "Працює", symbol: "clock", color: .gray) {
                    TimelineView(.periodic(from: .now, by: 30)) { context in
                        Text(Self.uptime(since: info.startedAt, now: context.date)).foregroundStyle(.secondary)
                    }
                }
                SettingsRow(title: "Процес", symbol: "number", color: .gray, text: "pid \(info.pid)")
                SettingsRow(title: "Node", symbol: "chevron.left.forwardslash.chevron.right", color: .gray, text: "\(info.node) · stage \(info.stage)")
            }
        } header: {
            Text("Стан")
        } footer: {
            Text("Сервер — процес, який аппка запускає сама: API, Web UI і з'єднання. Що він робить (модулі, транспорти, журнал) — у «Агент».")
        }

        Section {
            HStack {
                if !model.agentEnabled {
                    Button("Старт") { model.agentEnabled = true }
                        .buttonStyle(.borderedProminent)
                }
                Spacer()
                // TODO(observability): живий потік логів, подій і помилок сервера в аппці з фільтрами, а не відкриття файлу.
                Button("Відкрити лог") { NSWorkspace.shared.open(AgentService.logURL) }
            }
        } header: {
            Text("Керування")
        } footer: {
            Text("Observability — TODO: живі логи, події й помилки сервера в аппці. Поки що лог — просто файл. Зупинка й перезапуск — у «Небезпечній зоні» внизу.")
        }

        if let info = running {
            Section("Порти") {
                SettingsRow(title: "HTTPS", symbol: "lock.fill", color: .blue, text: "\(info.ports.https) · Web UI напряму")
                SettingsRow(title: "HTTP", symbol: "network", color: .blue,
                            text: model.currentNetworkTrusted ? "\(info.ports.http) · видно в довіреній Wi-Fi" : "\(info.ports.http) · лише на цьому Mac")
                SettingsRow(title: "Tailscale", symbol: "point.3.connected.trianglepath.dotted", color: .blue, text: "\(info.ports.tailnet) · лише 127.0.0.1, для serve")
            }
        }

        if model.agentEnabled {
            ServerDangerZone()
        }
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
