import Foundation

// Дзеркало contracts/src/ui.ts. Агент шле це дерево через stdout, SwiftUI-рендерер
// лише малює його і повертає UiEvent. Жодної логіки модулів тут немає.

enum UiTone: String, Codable {
    case accent, green, orange, red, gray, indigo, yellow
}

struct UiIcon: Codable, Hashable {
    var symbol: String
    var tone: UiTone
}

/// Значення налаштування або параметра дії: рядок, число або так/ні.
enum UiScalar: Codable, Hashable {
    case string(String)
    case number(Double)
    case bool(Bool)

    init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        if let value = try? container.decode(Bool.self) { self = .bool(value) }
        else if let value = try? container.decode(Double.self) { self = .number(value) }
        else { self = .string(try container.decode(String.self)) }
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        switch self {
        case .string(let value): try container.encode(value)
        case .number(let value): try container.encode(value)
        case .bool(let value): try container.encode(value)
        }
    }

    var stringValue: String? { if case .string(let value) = self { value } else { nil } }
    var boolValue: Bool? { if case .bool(let value) = self { value } else { nil } }
}

struct UiAction: Codable, Hashable {
    var module: String
    var name: String
    var params: [String: UiScalar]?
}

struct UiButton: Codable, Hashable, Identifiable {
    enum Variant: String, Codable { case filled, plain, destructive }
    var id: String
    var label: String
    var action: UiAction
    var variant: Variant?
    var disabled: Bool?
    var confirm: String?
}

struct UiOption: Codable, Hashable {
    var value: String
    var label: String
}

struct UiSettingRef: Codable, Hashable {
    var module: String
    var key: String
}

/// Керувальний елемент праворуч у рядку.
enum UiControl: Decodable, Hashable {
    /// Перемикач: з `setting` пише налаштування, без нього викликає `on` / `off`.
    case toggle(value: Bool, disabled: Bool, setting: UiSettingRef?, on: UiAction?, off: UiAction?)
    case select(value: String, options: [UiOption], disabled: Bool, setting: UiSettingRef)
    case button(UiButton)

    private enum Keys: String, CodingKey { case type, value, disabled, setting, on, off, options, button }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: Keys.self)
        let disabled = try c.decodeIfPresent(Bool.self, forKey: .disabled) ?? false
        switch try c.decode(String.self, forKey: .type) {
        case "switch":
            self = .toggle(
                value: try c.decode(Bool.self, forKey: .value), disabled: disabled,
                setting: try c.decodeIfPresent(UiSettingRef.self, forKey: .setting),
                on: try c.decodeIfPresent(UiAction.self, forKey: .on),
                off: try c.decodeIfPresent(UiAction.self, forKey: .off))
        case "select":
            self = .select(
                value: try c.decode(String.self, forKey: .value),
                options: try c.decode([UiOption].self, forKey: .options), disabled: disabled,
                setting: try c.decode(UiSettingRef.self, forKey: .setting))
        default:
            self = .button(try c.decode(UiButton.self, forKey: .button))
        }
    }
}

struct UiDot: Codable, Hashable {
    var tone: UiTone
    var pulse: Bool?
}

struct UiListItem: Codable, Hashable, Identifiable {
    var id: String
    var label: String
    var hint: String?
    var value: String?
}

/// Вузол дерева. Невідомий тип стає `.unknown`, щоб нова версія агента не ламала старий рендерер.
indirect enum UiNode: Decodable, Identifiable, Hashable {
    case section(id: String, title: String?, footer: String?, children: [UiNode])
    case row(UiRow)
    case status(UiStatus)
    case toggle(id: String, label: String, hint: String?, icon: UiIcon?, setting: UiSettingRef, value: Bool, disabled: Bool)
    case select(id: String, label: String, hint: String?, icon: UiIcon?, setting: UiSettingRef, value: String, options: [UiOption], disabled: Bool)
    case buttons(id: String, buttons: [UiButton])
    case list(id: String, items: [UiListItem], empty: String?)
    case text(id: String, text: String, tone: UiTone?)
    case unknown(id: String)

    var id: String {
        switch self {
        case .section(let id, _, _, _), .toggle(let id, _, _, _, _, _, _), .select(let id, _, _, _, _, _, _, _),
             .buttons(let id, _), .list(let id, _, _), .text(let id, _, _), .unknown(let id):
            id
        case .row(let row): row.id
        case .status(let status): status.id
        }
    }

    private enum Keys: String, CodingKey {
        case type, id, title, footer, children, label, hint, icon, module, key, value, options, disabled, buttons, items, empty, text, tone
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: Keys.self)
        let id = try c.decode(String.self, forKey: .id)
        let disabled = try c.decodeIfPresent(Bool.self, forKey: .disabled) ?? false
        switch try c.decode(String.self, forKey: .type) {
        case "section":
            self = .section(id: id, title: try c.decodeIfPresent(String.self, forKey: .title),
                            footer: try c.decodeIfPresent(String.self, forKey: .footer),
                            children: try c.decode([UiNode].self, forKey: .children))
        case "row":
            self = .row(try UiRow(from: decoder))
        case "status":
            self = .status(try UiStatus(from: decoder))
        case "switch":
            self = .toggle(id: id, label: try c.decode(String.self, forKey: .label),
                           hint: try c.decodeIfPresent(String.self, forKey: .hint),
                           icon: try c.decodeIfPresent(UiIcon.self, forKey: .icon),
                           setting: UiSettingRef(module: try c.decode(String.self, forKey: .module), key: try c.decode(String.self, forKey: .key)),
                           value: try c.decode(Bool.self, forKey: .value), disabled: disabled)
        case "select":
            self = .select(id: id, label: try c.decode(String.self, forKey: .label),
                           hint: try c.decodeIfPresent(String.self, forKey: .hint),
                           icon: try c.decodeIfPresent(UiIcon.self, forKey: .icon),
                           setting: UiSettingRef(module: try c.decode(String.self, forKey: .module), key: try c.decode(String.self, forKey: .key)),
                           value: try c.decode(String.self, forKey: .value),
                           options: try c.decode([UiOption].self, forKey: .options), disabled: disabled)
        case "buttons":
            self = .buttons(id: id, buttons: try c.decode([UiButton].self, forKey: .buttons))
        case "list":
            self = .list(id: id, items: try c.decode([UiListItem].self, forKey: .items),
                         empty: try c.decodeIfPresent(String.self, forKey: .empty))
        case "text":
            self = .text(id: id, text: try c.decode(String.self, forKey: .text),
                         tone: try c.decodeIfPresent(UiTone.self, forKey: .tone))
        default:
            self = .unknown(id: id)
        }
    }
}

struct UiRow: Decodable, Hashable {
    var id: String
    var label: String
    var value: String?
    var hint: String?
    var icon: UiIcon?
    var prominent: Bool?
    var dot: UiDot?
    /// Кінець зворотного відліку (ISO). Рендерер сам рахує H:MM:SS щосекунди.
    var countdownTo: Date?
    var control: UiControl?
}

struct UiStatus: Decodable, Hashable {
    var id: String
    var label: String
    var hint: String?
    var icon: UiIcon?
    var tone: UiTone
    var pulse: Bool?
    var value: String?
    var countdownTo: Date?
}

struct UiPage: Decodable, Hashable, Identifiable {
    enum Group: String, Decodable { case modules, system }
    var id: String
    var module: String
    var title: String
    var icon: UiIcon
    var group: Group
    var children: [UiNode]
}

struct UiModuleInfo: Decodable, Hashable, Identifiable {
    var id: String
    var title: String
    var icon: UiIcon
    /// Системні дозволи, які модуль просить (`MacPermission`). Невідомі Mac-аппці імена він ігнорує.
    var permissions: [String]?
}

struct UiTree: Decodable, Hashable {
    struct App: Decodable, Hashable {
        var title: String
        var host: String
        var online: Bool
    }
    var modules: [UiModuleInfo]
    var app: App
    var pages: [UiPage]
}

/// Що рендерер повертає агенту.
enum UiEvent: Encodable {
    case action(UiAction)
    case setting(module: String, key: String, value: UiScalar)

    private enum Keys: String, CodingKey { case type, action, change }
    private struct Change: Encodable { let module: String; let key: String; let value: UiScalar }

    func encode(to encoder: Encoder) throws {
        var c = encoder.container(keyedBy: Keys.self)
        switch self {
        case .action(let action):
            try c.encode("action", forKey: .type)
            try c.encode(action, forKey: .action)
        case .setting(let module, let key, let value):
            try c.encode("setting", forKey: .type)
            try c.encode(Change(module: module, key: key, value: value), forKey: .change)
        }
    }
}

enum UiTreeDecoder {
    /// ISO-дати з мілісекундами, як їх пише JavaScript.
    static let decoder: JSONDecoder = {
        let decoder = JSONDecoder()
        let withFraction = ISO8601DateFormatter()
        withFraction.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        let plain = ISO8601DateFormatter()
        decoder.dateDecodingStrategy = .custom { decoder in
            let text = try decoder.singleValueContainer().decode(String.self)
            if let date = withFraction.date(from: text) ?? plain.date(from: text) { return date }
            throw DecodingError.dataCorrupted(.init(codingPath: decoder.codingPath, debugDescription: "bad date \(text)"))
        }
        return decoder
    }()
}
