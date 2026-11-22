import AppKit
import SwiftUI

/// «Сервер»: сам процес агента — стан, керування, навантаження, порти і звідки він віддає пульт.
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
            Text("Сервер — процес, який аппка запускає сама: API, пульт і з'єднання. Що він робить (модулі, транспорти, журнал) — у «Агент».")
        }

        Section("Керування") {
            HStack {
                if model.agentEnabled {
                    Button("Стоп") { model.agentEnabled = false }
                    Button("Перезапустити") { model.restartAgent() }
                } else {
                    Button("Старт") { model.agentEnabled = true }
                        .buttonStyle(.borderedProminent)
                }
                Spacer()
                Button("Відкрити лог") { NSWorkspace.shared.open(AgentService.logURL) }
            }
        }

        if let info = running {
            Section {
                SettingsRow(title: "CPU", symbol: "cpu", color: .orange, text: String(format: "%.1f %%", info.usage.cpu))
                SettingsRow(title: "Пам'ять", symbol: "memorychip", color: .orange,
                            text: "\(Self.bytes(info.usage.rss)) · купа \(Self.bytes(info.usage.heapUsed))")
                SettingsRow(title: "Навантаження Mac", symbol: "gauge.with.dots.needle.33percent", color: .orange,
                            text: String(format: "%.2f за 1 хв", info.usage.load))
            } header: {
                Text("Навантаження")
            } footer: {
                Text("CPU — відсоток одного ядра за останні 10 с. Оновлюється раз на 10 с.")
            }

            Section("Порти") {
                SettingsRow(title: "HTTPS", symbol: "lock.fill", color: .blue, text: "\(info.ports.https) · дашборд напряму")
                SettingsRow(title: "HTTP", symbol: "network", color: .blue,
                            text: model.currentNetworkTrusted ? "\(info.ports.http) · видно в довіреній Wi-Fi" : "\(info.ports.http) · лише на цьому Mac")
                SettingsRow(title: "Tailscale", symbol: "point.3.connected.trianglepath.dotted", color: .blue, text: "\(info.ports.tailnet) · лише 127.0.0.1, для serve")
            }

            Section {
                SettingsRow(title: "Звідки", symbol: "globe", color: .teal) {
                    HStack(spacing: 8) {
                        Text(Self.webSource(info.web)).foregroundStyle(.secondary)
                        if let builtAt = info.web.builtAt {
                            SourceTag(text: builtAt.formatted(date: .abbreviated, time: .shortened))
                        }
                    }
                }
            } header: {
                Text("Пульт")
            } footer: {
                Text("Новий пульт публікує scripts/publish-web-local.sh: сервер віддає його одразу, без перевстановлення аппки. Без публікації — збірка з аппки.")
            }
        }
    }

    private var statusColor: Color {
        if case .failed = model.agentStatus { return .red }
        return model.agentStatus.isRunning ? .green : .secondary
    }

    private static func bytes(_ value: Int) -> String {
        ByteCountFormatter.string(fromByteCount: Int64(value), countStyle: .memory)
    }

    private static func webSource(_ web: AgentServerInfo.Web) -> String {
        switch web.source {
        case "published": "опублікований"
        case "bundle": "з аппки"
        default: "немає збірки"
        }
    }

    private static func uptime(since start: Date, now: Date) -> String {
        let minutes = max(0, Int(now.timeIntervalSince(start) / 60))
        if minutes < 60 { return "\(minutes) хв" }
        let hours = minutes / 60
        return hours < 24 ? "\(hours) год \(minutes % 60) хв" : "\(hours / 24) д \(hours % 24) год"
    }
}
