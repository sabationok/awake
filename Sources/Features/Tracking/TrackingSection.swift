import SwiftUI

/// Вкладка «Трекінг»: історія сесій, які видно з журналу.
struct TrackingSection: View {
    @EnvironmentObject private var model: AwakeModel

    var body: some View {
        let sessions = SessionHistory.sessions(from: model.log)
        Section {
            SettingsRow(title: "Сесій у журналі", symbol: "number", color: .gray, text: "\(sessions.count)")
            SettingsRow(title: "Без сну загалом", symbol: "clock.fill", color: .brown,
                        text: SessionHistory.totalText(sessions))
        }
        Section("Історія") {
            if sessions.isEmpty {
                Text("Сесій ще не було").foregroundStyle(.secondary)
            }
            ForEach(sessions.reversed().prefix(30)) { session in
                VStack(alignment: .leading, spacing: 2) {
                    Text(Self.range(session)).monospacedDigit()
                    Text(Self.detail(session))
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
        }
    }

    private static let format: Date.FormatStyle = .dateTime.day(.twoDigits).month(.twoDigits).hour().minute()

    private static func range(_ session: SessionRecord) -> String {
        let start = session.start.formatted(format)
        guard let end = session.end else { return "\(start) → не завершено" }
        return "\(start) → \(end.formatted(format))"
    }

    private static func detail(_ session: SessionRecord) -> String {
        var parts = ["план \(session.plannedDuration)"]
        if let seconds = session.actualSeconds {
            parts.append("фактично \(Int(seconds) / 3600) год \((Int(seconds) % 3600) / 60) хв")
        }
        if let from = session.batteryStart {
            parts.append("батарея \(from)%" + (session.batteryEnd.map { " → \($0)%" } ?? ""))
        }
        if let reason = session.reason { parts.append(reason) }
        return parts.joined(separator: " · ")
    }
}
