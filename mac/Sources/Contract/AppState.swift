import Foundation

/// Port of the pure functions of `contracts/src/state.ts`: the app keeps its AppState copy as raw JSON (the server
/// owns the shape), applies `state.patch` ops by path and resolves `show` / `bind` of a row before the row is decoded
/// into a render node. Same rules as the web: no path → visible / static value.
enum AppStateJSON {
    private static let forbidden: Set<String> = ["__proto__", "prototype", "constructor"]

    /// The value at a dotted path; nil when the path breaks.
    static func read(_ state: JSONValue?, _ path: String) -> JSONValue? {
        var node = state
        for key in path.split(separator: ".", omittingEmptySubsequences: false) {
            guard case .object(let object)? = node, let next = object[String(key)] else { return nil }
            node = next
        }
        return node
    }

    /// `applyStatePatch`: `set` by path, missing intermediate objects are created; a forbidden key drops the patch.
    static func apply(_ state: JSONValue, _ ops: [StatePatchOp]) -> JSONValue? {
        var next = state
        for op in ops {
            let keys = op.path.split(separator: ".", omittingEmptySubsequences: false).map(String.init)
            if keys.contains(where: forbidden.contains) { return nil }
            next = set(next, keys[...], op.value)
        }
        return next
    }

    private static func set(_ node: JSONValue, _ keys: ArraySlice<String>, _ value: JSONValue) -> JSONValue {
        guard let key = keys.first else { return value }
        var object: [String: JSONValue] = if case .object(let o) = node { o } else { [:] }
        object[key] = set(object[key] ?? .null, keys.dropFirst(), value)
        return .object(object)
    }

    /// The key of a value for `show` / `bind`: nil — no path; `.some(nil)` — a value without a key (object, number).
    private static func key(_ value: JSONValue?) -> String?? {
        switch value {
        case nil: return nil
        case .null?: return .some("null")
        case .string(let s)?: return .some(s)
        case .bool(let b)?: return .some(b ? "true" : "false")
        default: return .some(nil)
        }
    }

    /// `isShown`: `{path, when}` or `{path, unless}`; no `show` or no path in the state → visible.
    static func isShown(_ state: JSONValue?, _ show: JSONValue?) -> Bool {
        guard case .object(let s)? = show, case .string(let path)? = s["path"], let state else { return true }
        guard let found = key(read(state, path)) else { return true }
        func list(_ name: String) -> [String]? {
            guard case .array(let items)? = s[name] else { return nil }
            return items.compactMap { if case .string(let v) = $0 { v } else { nil } }
        }
        if let when = list("when") { return found.map(when.contains) ?? false }
        if let unless = list("unless") { return found.map { !unless.contains($0) } ?? true }
        return true
    }

    /// `resolveNodeProps`: state values into props (`{props}` / `{value}`), component state into a switch's
    /// `value` / `disabled` and a button's `disabled`.
    static func resolve(_ props: [String: JSONValue], _ state: JSONValue?) -> [String: JSONValue] {
        guard case .object(let bind)? = props["bind"], let state else { return props }
        var next = props
        if case .object(let map)? = bind["props"] {
            for (prop, path) in map where !forbidden.contains(prop) {
                if case .string(let p) = path, let value = read(state, p) { next[prop] = value }
            }
            return next
        }
        if case .string(let path)? = bind["value"], bind["component"] == nil {
            if let value = read(state, path) { next["value"] = value }
            return next
        }
        guard case .string(let component)? = bind["component"], case .string(let path)? = bind["path"],
              let value = read(state, path) else { return props }
        var resolved: String? = if case .string(let f)? = bind["fallback"] { f } else { nil }
        if case .object(let map)? = bind["map"], let k = key(value) ?? nil, case .string(let mapped)? = map[k] { resolved = mapped }
        switch (component, resolved) {
        case ("switch", "on"?), ("switch", "off"?):
            let on = JSONValue.bool(resolved == "on")
            if next["type"] == .string("row"), case .object(var control)? = next["control"] {
                control["value"] = on
                next["control"] = .object(control)
            } else {
                next["value"] = on
            }
        case ("switch", "disabled"?), ("button", "disabled"?):
            if next["type"] == .string("row"), case .object(var control)? = next["control"] {
                control["disabled"] = .bool(true)
                next["control"] = .object(control)
            } else {
                next["disabled"] = .bool(true)
            }
        default:
            break
        }
        return next
    }
}

/// One `set` op of `state.patch`.
struct StatePatchOp: Decodable, Hashable {
    var path: String
    var value: JSONValue

    private enum Keys: String, CodingKey { case path, value }
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: Keys.self)
        path = try c.decode(String.self, forKey: .path)
        // `"value": null` is a value (the session ended), not a missing key.
        value = try c.decodeIfPresent(JSONValue.self, forKey: .value) ?? .null
    }
}

/// `StateFull` / `StatePatch` on the socket (`{"type":"state.full","data":{rev,state}}`).
struct StateFullMessage: Decodable { var rev: Int; var state: JSONValue }
struct StatePatchMessage: Decodable { var rev: Int; var ops: [StatePatchOp] }

/// `UiNotify`: a toast the server decided on (session restarted, stopped).
struct UiNotify: Decodable, Hashable {
    enum Kind: String, Decodable { case info, success, warning, error }
    var kind: Kind
    var title: String
    var detail: String?

    private enum Keys: String, CodingKey { case kind, title, detail }
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: Keys.self)
        // A new kind from a newer server is drawn as info, not dropped.
        kind = (try? c.decode(Kind.self, forKey: .kind)) ?? .info
        title = try c.decode(String.self, forKey: .title)
        detail = try c.decodeIfPresent(String.self, forKey: .detail)
    }
}
