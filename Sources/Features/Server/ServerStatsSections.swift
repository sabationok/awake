import SwiftUI

/// Статистика сервера з stats-рушія агента: фільтр періоду, навантаження (середнє за бакет) і запити графіками.
/// Агент шле все вікно періоду, далі після кожного заміру (10 с) лише поточний бакет — графік дописується сам.
struct ServerStatsSections: View {
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
