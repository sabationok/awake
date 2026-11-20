import SwiftUI

/// Зворотний відлік до `until`, оновлюється щосекунди. Формат як у рядку сесії: 59:59 або 7:59:59.
struct UiCountdown: View {
    let until: Date

    var body: some View {
        TimelineView(.periodic(from: .now, by: 1)) { context in
            Text(Countdown.string(until: until, now: context.date))
                .monospacedDigit()
                .foregroundStyle(.secondary)
        }
    }
}
