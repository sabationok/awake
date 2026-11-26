import Foundation

// Дзеркало нових вузлів contracts/src/ui.ts: дії з меню, картка елемента, сповіщення.
// Усі нові поля необов'язкові, щоб старіший агент не ламав декодування.

/// Колір дії: default — сіра, accent — синя, warn — помаранчева, danger — червона.
/// Невідоме значення стає `default`, а не помилкою всього дерева.
enum UiActionVariant: String, Decodable, Hashable {
    case `default`, accent, warn, danger

    init(from decoder: Decoder) throws {
        let raw = try decoder.singleValueContainer().decode(String.self)
        self = UiActionVariant(rawValue: raw) ?? .default
    }
}

/// Підтвердження перед дією.
struct UiConfirm: Decodable, Hashable {
    var title: String
    var text: String
    var ok: String
}

/// Поле форми дії; значення йде в `action.params[name]`.
struct UiFormField: Decodable, Hashable, Identifiable {
    var name: String
    var label: String
    /// text | password | url | select; невідомий вид малюється як text.
    var kind: String
    var value: String?
    var placeholder: String?
    var hint: String?
    var required: Bool?
    var minLength: Int?
    var options: [UiOption]?

    var id: String { name }
}

/// Форма дії: одне поле — інлайн у картці, два і більше — аркуш (sheet).
struct UiForm: Decodable, Hashable {
    var title: String?
    var fields: [UiFormField]
    var submit: String?
}

/// Пункт дії. Сервер віддає вже розв'язаний за станом список: клієнт нічого не перевіряє.
struct UiMenuItem: Decodable, Hashable, Identifiable {
    var id: String
    var label: String
    var icon: UiIcon?
    var variant: UiActionVariant
    var action: UiAction
    var confirm: UiConfirm?
    var form: UiForm?
    /// На Mac пункт зі scope mac активний; поле потрібне лише web.
    var scope: String?
    var hint: String?
    var disabled: Bool?
}

/// Мітка-чип без дії.
struct UiTag: Decodable, Hashable {
    var label: String
    var tone: UiTone?
}

/// Стан словом з крапкою: «● Активна».
struct UiStatusBadge: Decodable, Hashable {
    var label: String
    var tone: UiTone
    var pulse: Bool?
}

/// Картка елемента: заголовок (назва; праворуч статус, керування, дії), теги, значення для копіювання, коментар.
struct UiItem: Decodable, Hashable {
    struct Copy: Decodable, Hashable {
        var value: String
        var label: String?
    }

    var id: String
    var title: String
    var icon: UiIcon?
    var status: UiStatusBadge?
    var tags: [UiTag]?
    var copy: Copy?
    var comment: String?
    var control: UiControl?
    var actions: [UiMenuItem]?
}

/// Сповіщення в сторінці. Чи показувати — вирішує сервер; хрестик лише шле `dismiss`.
struct UiNotice: Decodable, Hashable {
    enum Variant: String, Decodable { case info, warn, error }

    var id: String
    var variant: Variant
    var icon: UiIcon?
    var title: String?
    var text: String
    /// У `Form` прилипання не працює: на Mac сповіщення завжди в потоці.
    var sticky: String?
    var dismiss: UiAction?
}

/// Секція: заголовок, підпис, стан і дії в шапці, рядки.
struct UiSection: Decodable, Hashable {
    var id: String
    var title: String?
    var footer: String?
    var status: UiStatusBadge?
    var actions: [UiMenuItem]?
    var children: [UiNode]
}

extension UiAction {
    /// Та сама дія зі значеннями полів форми в params.
    func with(fields: [String: String]) -> UiAction {
        var copy = self
        copy.params = (params ?? [:]).merging(fields.mapValues { UiScalar.string($0) }) { _, new in new }
        return copy
    }
}
