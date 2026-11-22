import Foundation

/// Період графіків статистики (`StatsPeriod` у contracts): бакет обирає агент. «Сервер» і картки вебхуків.
enum StatsPeriod: String, CaseIterable, Identifiable, Codable {
    case hour, today, week, month

    var id: String { rawValue }

    var title: String {
        switch self {
        case .hour: "Година"
        case .today: "Сьогодні"
        case .week: "7 днів"
        case .month: "30 днів"
        }
    }
}
