import SwiftUI

/// Великий таймер по центру секції: відлік щосекунди або текст, коли відліку немає.
struct UiTimerView: View {
    let timer: UiTimer

    var body: some View {
        VStack(spacing: 4) {
            Group {
                if let until = timer.until {
                    TimelineView(.periodic(from: .now, by: 1)) { context in
                        Text(Countdown.string(until: until, now: context.date))
                    }
                } else {
                    Text(timer.value)
                }
            }
            .font(.system(size: 48, weight: .semibold, design: .rounded))
            .monospacedDigit()
            .foregroundStyle(timer.until == nil ? .secondary : (timer.tone?.color ?? .primary))
            if let caption = timer.caption {
                Text(caption).font(.callout).foregroundStyle(.secondary)
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 12)
    }
}
