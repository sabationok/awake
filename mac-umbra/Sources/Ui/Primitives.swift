import SwiftUI

/// Contract values to Umbra values. The server sends structure, the library decides the look.
extension UiTone {
    var umbra: Tone { Tone(rawValue: rawValue) ?? .gray }
}

extension UiActionVariant {
    var umbra: ButtonVariant { ButtonVariant(rawValue: rawValue) ?? .default }
}

extension UiButton.Variant? {
    var umbra: ButtonVariant {
        switch self {
        case .filled: .accent
        case .destructive: .danger
        // As web-umbra `fromButton`: only filled and destructive differ, the rest is the bordered default.
        case .plain, nil: .default
        }
    }
}

extension UiNotice.Variant {
    var tone: Tone {
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
