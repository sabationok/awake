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
            ServerStatsSections(pid: info.pid)

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

        if model.agentEnabled {
            ServerDangerZone()
        }
    }

    private var statusColor: Color {
        if case .failed = model.agentStatus { return .red }
        return model.agentStatus.isRunning ? .green : .secondary
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

/// Статистика сервера з stats-рушія агента: фільтр періоду, навантаження (середнє за бакет) і запити графіками.
/// Агент шле все вікно періоду, далі після кожного заміру (10 с) лише поточний бакет — графік дописується сам.
private struct ServerStatsSections: View {
    let pid: Int
    @EnvironmentObject private var model: AwakeModel
    @AppStorage("server.chartsPeriod") private var period: StatsPeriod = .today

    private var charts: [UiChart] {
        guard let data = model.serverCharts, data.period == period else { return [] }
        return data.charts
    }

    var body: some View {
        Section {
            Picker("Період", selection: $period) {
                ForEach(StatsPeriod.allCases) { Text($0.title).tag($0) }
            }
            .pickerStyle(.segmented)
            .labelsHidden()
            chartsOf(["cpu", "rss", "heap", "load"])
        } header: {
            Text("Навантаження")
        } footer: {
            Text("Середнє за бакет із замірів раз на 10 с. CPU — відсоток одного ядра. Поточний бакет оновлюється наживо.")
        }
        // Новий період або перезапущений агент (новий pid): агент шле графіки заново і далі тіки цього періоду.
        .task(id: "\(period.rawValue)|\(pid)") { model.requestServerCharts(period) }

        Section {
            chartsOf(["requests", "errors", "starts"])
        } header: {
            Text("Запити")
        } footer: {
            Text("Запити до API за шляхом; помилки: 4xx — відмова (токен, мережа), 5xx — збій агента. Дні — за UTC.")
        }
    }

    @ViewBuilder
    private func chartsOf(_ ids: [String]) -> some View {
        let shown = ids.compactMap { id in charts.first { $0.id == id } }
        if shown.isEmpty {
            Text("Завантаження…").foregroundStyle(.secondary)
        } else {
            ForEach(shown, id: \.id) { UiChartView(chart: $0) }
        }
    }
}
