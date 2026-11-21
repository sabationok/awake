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
                            .foregroundStyle(color(until: until, now: context.date))
                    }
                } else {
                    Text(timer.value).foregroundStyle(.secondary)
                }
            }
            .font(.system(size: 48, weight: .semibold, design: .rounded))
            .monospacedDigit()
            if let caption = timer.caption {
                Text(caption).font(.callout).foregroundStyle(.secondary)
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 12)
    }

    /// Від зеленого (уся сесія попереду) до червоного (час майже вийшов), приглушено, як у «Екранному часі».
    /// Без початку — колір тону.
    private func color(until: Date, now: Date) -> Color {
        guard let from = timer.from, until > from else { return timer.tone?.color ?? .primary }
        let left = min(1, max(0, until.timeIntervalSince(now) / until.timeIntervalSince(from)))
        return Color(hue: left / 3, saturation: 0.48, brightness: 0.78)
    }
}
