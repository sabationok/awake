import SwiftUI

/// Головна картка: опис, перемикач, рядок стану сесії і вибір тривалості.
struct SessionSection: View {
    @EnvironmentObject private var model: AwakeModel

    var body: some View {
        Section {
            header
            statusRow
        } footer: {
            Text("Сесія також зупиняється, коли ти виходиш з аппки.")
        }
    }

    private var header: some View {
        HStack(alignment: .top, spacing: 12) {
            SettingsIcon(symbol: AppSymbol.cup(active: model.isRunning), color: .brown, size: 36)
            VStack(alignment: .leading, spacing: 3) {
                Text("Awake").font(.headline)
                Text("Mac не засинає навіть із закритою кришкою. Сон повертається сам після таймера, при низькому заряді або перегріві.")
                    .font(.callout)
                    .foregroundStyle(.secondary)
                    .fixedSize(horizontal: false, vertical: true)
            }
            Spacer(minLength: 12)
            Toggle("", isOn: sessionBinding)
                .toggleStyle(.switch)
                .labelsHidden()
                .disabled(!model.permissionGranted && !model.isRunning)
        }
        .padding(.vertical, 4)
    }

    private var statusRow: some View {
        HStack {
            VStack(alignment: .leading, spacing: 3) {
                Text(title)
                HStack(spacing: 6) {
                    StatusDot(active: model.isRunning)
                    Text(subtitle).foregroundStyle(.secondary).monospacedDigit()
                }
                .font(.callout)
            }
            Spacer()
            if model.sleepBlockedOutside {
                Button("Повернути сон") { model.forceRestore() }
            } else {
                Picker("", selection: $model.preset) {
                    ForEach(SessionPreset.all) { Text($0.title).tag($0) }
                }
                .labelsHidden()
                .fixedSize()
                .disabled(model.isRunning)
            }
        }
    }

    private var sessionBinding: Binding<Bool> {
        Binding(
            get: { model.isRunning },
            set: { $0 ? model.start() : model.stop() }
        )
    }

    private var title: String {
        if model.isRunning, let end = model.endDate {
            return "Не спить до \(end.formatted(date: .omitted, time: .shortened))"
        }
        return model.sleepBlockedOutside ? "Сон заблоковано поза аппкою" : "Тривалість"
    }

    private var subtitle: String {
        if let remaining = model.remaining { return "Залишилось \(remaining)" }
        return model.sleepBlockedOutside ? "Скрипт не працює, а сон вимкнено" : "Вимкнено"
    }
}
