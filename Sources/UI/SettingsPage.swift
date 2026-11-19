import SwiftUI

/// Розділи бічного меню. Кожен розділ — окрема сторінка з власною формою.
enum SettingsPage: String, CaseIterable, Identifiable {
    case session, status, tracking, display, safety, telegram, settings, permission, log

    var id: String { rawValue }

    var title: String {
        switch self {
        case .session: "Сесія"
        case .status: "Стан"
        case .tracking: "Трекінг"
        case .display: "Дисплей"
        case .safety: "Безпека"
        case .telegram: "Telegram"
        case .settings: "Налаштування"
        case .permission: "Дозвіл"
        case .log: "Журнал"
        }
    }

    var symbol: String {
        switch self {
        case .session: "cup.and.saucer.fill"
        case .status: "waveform.path.ecg"
        case .tracking: "chart.bar.xaxis"
        case .display: "display"
        case .safety: "shield.fill"
        case .telegram: "paperplane.fill"
        case .settings: "gearshape.fill"
        case .permission: "lock.fill"
        case .log: "list.bullet.rectangle"
        }
    }

    /// Групи бічного меню в порядку показу.
    static let groups: [[SettingsPage]] = [
        [.session, .status, .tracking],
        [.display, .safety, .telegram],
        [.settings, .permission, .log],
    ]
}
