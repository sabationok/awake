import SwiftUI

/// Стан: крапка кольору тону і опис під назвою, праворуч значення або зворотний відлік.
struct UiStatusView: View {
    let status: UiStatus

    var body: some View {
        HStack(spacing: 10) {
            if let icon = status.icon {
                SettingsIcon(symbol: icon.symbol, color: icon.tone.color)
            }
            VStack(alignment: .leading, spacing: 3) {
                Text(status.label)
                HStack(spacing: 6) {
                    StatusDot(color: status.tone.color, pulse: status.pulse ?? false)
                    if let hint = status.hint {
                        Text(hint)
                    }
                }
                .font(.callout)
                .foregroundStyle(.secondary)
            }
            Spacer(minLength: 12)
            if let until = status.countdownTo {
                UiCountdown(until: until)
            } else if let value = status.value {
                Text(value).foregroundStyle(.secondary)
            }
        }
    }
}
