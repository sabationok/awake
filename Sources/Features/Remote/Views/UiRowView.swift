import SwiftUI

/// Рядок з агента. `prominent` — шапка розділу як колишня картка «Сесія»:
/// іконка 36 pt, назва великим шрифтом, опис переноситься. Звичайний — іконка і назва, під ними стан.
struct UiRowView: View {
    let row: UiRow

    var body: some View {
        if row.prominent == true {
            prominent
        } else {
            normal
        }
    }

    private var prominent: some View {
        HStack(alignment: .top, spacing: 12) {
            if let icon = row.icon {
                SettingsIcon(symbol: icon.symbol, color: icon.tone.color, size: 36)
            }
            VStack(alignment: .leading, spacing: 3) {
                Text(row.label).font(.headline)
                if let hint = row.hint {
                    Text(hint)
                        .font(.callout)
                        .foregroundStyle(.secondary)
                        .fixedSize(horizontal: false, vertical: true)
                }
                metaLine(withHint: false)
            }
            Spacer(minLength: 12)
            trailing
        }
        .padding(.vertical, 4)
    }

    private var normal: some View {
        HStack(spacing: 10) {
            if let icon = row.icon {
                SettingsIcon(symbol: icon.symbol, color: icon.tone.color)
            }
            VStack(alignment: .leading, spacing: 3) {
                Text(row.label)
                metaLine(withHint: true)
            }
            Spacer(minLength: 12)
            trailing
        }
    }

    /// Під назвою: крапка, опис і зворотний відлік. Показується лише те, що є.
    @ViewBuilder
    private func metaLine(withHint: Bool) -> some View {
        if row.dot != nil || (withHint && row.hint != nil) || row.countdownTo != nil {
            HStack(spacing: 6) {
                if let dot = row.dot {
                    StatusDot(color: dot.tone.color, pulse: dot.pulse ?? false)
                }
                if withHint, let hint = row.hint {
                    Text(hint)
                }
                if let until = row.countdownTo {
                    UiCountdown(until: until)
                }
            }
            .font(.callout)
            .foregroundStyle(.secondary)
        }
    }

    /// Керування має пріоритет над значенням.
    @ViewBuilder
    private var trailing: some View {
        if let control = row.control {
            UiControlView(control: control)
        } else if let value = row.value {
            Text(value).foregroundStyle(.secondary)
        }
    }
}
