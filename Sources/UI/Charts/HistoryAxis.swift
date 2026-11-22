import Foundation

/// Скопійовано з Mia (apps/mac/Sources/UI/Charts); додано тижні й місяці.
/// X-axis rules of a `BarHistoryChart`, System Settings → Акумулятор style: a short label under every bucket
/// (weekday letter for days, every third hour for hours) and a date marker with a solid gridline where a new
/// week (days) or a new day (hours) starts, plus the first bucket. Weeks and months: a date under every bar, no markers.
struct HistoryAxis {
    let unit: Calendar.Component
    var calendar = Calendar.autoupdatingCurrent
    var locale = Locale(identifier: "uk_UA")
    /// Day buckets: a weekday under every bar, or (many bars) only under date markers.
    var labelsEveryBucket = true

    private var isCoarse: Bool { unit == .weekOfYear || unit == .month }

    /// Buckets that get a gridline and a label.
    func shows(_ date: Date) -> Bool {
        if isCoarse { return true }
        return unit == .hour ? calendar.component(.hour, from: date) % 3 == 0
            : labelsEveryBucket || calendar.component(.weekday, from: date) == calendar.firstWeekday
    }

    /// Bucket that starts a week or a day and carries the date under its label.
    func isMarker(_ date: Date, first: Date?) -> Bool {
        if isCoarse { return false }
        if date == first { return true }
        switch unit {
        case .hour: return calendar.component(.hour, from: date) == 0
        default: return calendar.component(.weekday, from: date) == calendar.firstWeekday
        }
    }

    func label(_ date: Date) -> String {
        let style = Date.FormatStyle(locale: locale, calendar: calendar)
        switch unit {
        case .hour: return String(calendar.component(.hour, from: date))
        case .weekOfYear: return date.formatted(style.day().month(.twoDigits))
        case .month: return date.formatted(style.month(.abbreviated))
        default:
            var cal = calendar
            cal.locale = locale
            let symbols = cal.veryShortStandaloneWeekdaySymbols
            return symbols[cal.component(.weekday, from: date) - 1].uppercased()
        }
    }

    /// "6 лист."
    func marker(_ date: Date) -> String {
        date.formatted(Date.FormatStyle(locale: locale, calendar: calendar).day().month(.abbreviated))
    }
}
