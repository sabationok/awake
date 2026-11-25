import SwiftUI

/// Звідки елемент інтерфейсу: вшитий в аппку (потребує нової збірки) чи прийшов деревом від агента.
enum UiOrigin {
    case native
    case agent

    var color: Color {
        switch self {
        case .native: .blue
        case .agent: .orange
        }
    }

    /// Ключ перемикача підсвітки в UserDefaults.
    var storageKey: String {
        switch self {
        case .native: "ui.highlight.native"
        case .agent: "ui.highlight.agent"
        }
    }
}

/// Що саме позначаємо: сторінку цілком (рамка) чи секцію на змішаній сторінці (тло рядків).
enum UiOriginScope {
    case page
    case section
}

/// Підсвітка походження елемента для розробки: вмикається перемикачами в «Сервер → Інтерфейс».
/// Позначається найвищий елемент одного походження, а не кожен рядок.
private struct OriginHighlight: ViewModifier {
    let origin: UiOrigin
    let scope: UiOriginScope
    @AppStorage(UiOrigin.native.storageKey) private var highlightNative = false
    @AppStorage(UiOrigin.agent.storageKey) private var highlightAgent = false

    private var isOn: Bool {
        switch origin {
        case .native: highlightNative
        case .agent: highlightAgent
        }
    }

    @ViewBuilder
    func body(content: Content) -> some View {
        if !isOn {
            content
        } else if scope == .page {
            content.overlay {
                RoundedRectangle(cornerRadius: 10)
                    .strokeBorder(origin.color.opacity(0.6), lineWidth: 1)
                    .padding(4)
                    .allowsHitTesting(false)
            }
        } else {
            // Секцію у grouped Form рамкою не обвести: позначаємо тлом її рядків.
            content.listRowBackground(origin.color.opacity(0.10))
        }
    }
}

extension View {
    func originHighlight(_ origin: UiOrigin, scope: UiOriginScope) -> some View {
        modifier(OriginHighlight(origin: origin, scope: scope))
    }
}
