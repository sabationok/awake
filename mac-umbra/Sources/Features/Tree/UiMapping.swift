import SwiftUI

/// Contract values to Umbra values. The server sends structure, the library decides the look.
extension UiTone {
    var umbra: UmbraTone { UmbraTone(rawValue: rawValue) ?? .gray }
}

extension UiActionVariant {
    var umbra: UmbraButtonVariant { UmbraButtonVariant(rawValue: rawValue) ?? .default }
}

extension UiButton.Variant? {
    var umbra: UmbraButtonVariant {
        switch self {
        case .filled: .accent
        case .destructive: .danger
        case .plain: .ghost
        case nil: .default
        }
    }
}

extension UiNotice.Variant {
    var tone: UmbraTone {
        switch self {
        case .info: .accent
        case .warn: .yellow
        case .error: .red
        }
    }
}

enum Countdown {
    static func text(to date: Date, now: Date) -> String {
        let left = max(0, Int(date.timeIntervalSince(now)))
        return String(format: "%d:%02d:%02d", left / 3600, left / 60 % 60, left % 60)
    }
}
