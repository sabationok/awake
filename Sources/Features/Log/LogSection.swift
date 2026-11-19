import AppKit
import SwiftUI

struct LogSection: View {
    @EnvironmentObject private var model: AwakeModel
    var limit = 6

    var body: some View {
        Section {
            ForEach(model.log.suffix(limit)) { entry in
                HStack(alignment: .firstTextBaseline, spacing: 8) {
                    Text(Self.time.string(from: entry.date))
                        .foregroundStyle(.tertiary)
                    Text(entry.text)
                        .foregroundStyle(.secondary)
                        .textSelection(.enabled)
                }
                .font(.callout.monospaced())
            }
        } header: {
            HStack {
                Text("Журнал")
                Spacer()
                Button("Відкрити файл") { NSWorkspace.shared.open(LogStore.url) }
                    .buttonStyle(.plain)
                    .foregroundStyle(.secondary)
                    .font(.callout)
            }
        } footer: {
            Text("Зберігається 30 днів у ~/.config/awake/awake.log.")
        }
    }

    private static let time: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "dd.MM HH:mm"
        return f
    }()
}
