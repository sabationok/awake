import SwiftUI

typealias SendEvent = (UiEvent) -> Void

/// Renders one contract node with Umbra components. Row-like children of a section share one panel.
struct NodeView: View {
    let node: UiNode
    let send: SendEvent

    var body: some View {
        switch node {
        case .section(let s): SectionNode(section: s, send: send)
        case .row(let r): RowNode(row: r, send: send)
        case .status(let s): StatusNode(status: s)
        case .toggle(_, let label, let hint, let icon, let setting, let value, let disabled):
            UmbraRow(label, hint: hint, symbol: icon?.symbol, tone: icon?.tone.umbra) {
                Toggle(label, isOn: Binding(get: { value }, set: {
                    send(.setting(module: setting.module, key: setting.key, value: .bool($0)))
                })).toggleStyle(.umbra).labelsHidden().disabled(disabled)
            }
        case .select(_, let label, let hint, let icon, let setting, let value, let options, let disabled):
            UmbraRow(label, hint: hint, symbol: icon?.symbol, tone: icon?.tone.umbra) {
                UmbraSelect(label, selection: Binding(get: { value }, set: {
                    send(.setting(module: setting.module, key: setting.key, value: .string($0)))
                }), options: options.map { UmbraOption($0.value, $0.label, disabled: $0.disabled ?? false) })
                .disabled(disabled)
            }
        case .buttons(_, let buttons):
            HStack(spacing: 8) {
                ForEach(buttons) { ButtonNode(button: $0, send: send) }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        case .list(_, let items, let empty):
            if items.isEmpty {
                UmbraEmptyState(empty ?? "Порожньо", symbol: "tray")
            } else {
                ForEach(items) { UmbraListRow($0.label, subtitle: $0.hint, trailing: $0.value ?? "") }
            }
        case .text(_, let text, let tone):
            TextNode(text: text, tone: tone)
        case .tabs(_, let tabs, let value, let setting):
            TabsNode(tabs: tabs, initial: value, setting: setting, send: send)
        case .timer(let t): TimerNode(timer: t)
        case .chart(let c):
            UmbraRow(c.title, hint: "Графік ще не перенесено в Umbra", value: "\(c.points.count) точок",
                     symbol: "chart.bar", tone: c.tone?.umbra)
        case .item(let i): ItemNode(item: i, send: send)
        case .notice(let n):
            UmbraNotice(tone: n.variant.tone, symbol: n.icon?.symbol ?? "info.circle", title: n.title ?? n.text,
                        text: n.title == nil ? nil : n.text) {
                if let dismiss = n.dismiss {
                    Button("Закрити") { send(.action(dismiss)) }.buttonStyle(.umbra(.ghost, size: .small))
                }
            }
        case .separator(_, let word):
            HStack {
                Rectangle().frame(height: 1).foregroundStyle(.quaternary)
                if let word { Text(word).font(.system(size: 11)).foregroundStyle(.secondary) }
                Rectangle().frame(height: 1).foregroundStyle(.quaternary)
            }
        case .qr(_, let value, _):
            UmbraQrCode(value).frame(width: 180)
        case .unknown:
            EmptyView()
        }
    }
}

extension UiNode {
    /// Nodes that sit inside a panel as rows.
    var isRowLike: Bool {
        switch self {
        case .row, .status, .toggle, .select, .item, .list, .chart: true
        default: false
        }
    }
}

/// Splits children into runs: consecutive row-like nodes go into one panel, the rest stand alone.
struct NodeStack: View {
    let nodes: [UiNode]
    let send: SendEvent

    private var runs: [(id: String, panel: Bool, nodes: [UiNode])] {
        var out: [(id: String, panel: Bool, nodes: [UiNode])] = []
        for node in nodes {
            if node.isRowLike, let last = out.last, last.panel {
                out[out.count - 1].nodes.append(node)
            } else {
                out.append((node.id, node.isRowLike, [node]))
            }
        }
        return out
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 18) {
            ForEach(runs, id: \.id) { run in
                if run.panel {
                    UmbraPanel { ForEach(run.nodes) { NodeView(node: $0, send: send) } }
                } else {
                    ForEach(run.nodes) { NodeView(node: $0, send: send) }
                }
            }
        }
    }
}

struct SectionNode: View {
    let section: UiSection
    let send: SendEvent

    var body: some View {
        UmbraSection(section.title, footer: section.footer) {
            NodeStack(nodes: section.children, send: send)
        } trailing: {
            HStack(spacing: 8) {
                if let s = section.status { UmbraBadge(s.label, tone: s.tone.umbra, pulse: s.pulse ?? false) }
                if let actions = section.actions, !actions.isEmpty { ActionsMenu(items: actions, send: send) }
            }
        }
    }
}

struct RowNode: View {
    let row: UiRow
    let send: SendEvent

    var body: some View {
        if let until = row.countdownTo {
            TimelineView(.periodic(from: .now, by: 1)) { ctx in content(value: Countdown.text(to: until, now: ctx.date)) }
        } else {
            content(value: row.value)
        }
    }

    private func content(value: String?) -> some View {
        UmbraRow(row.label, hint: row.hint, value: value, symbol: row.icon?.symbol, tone: row.icon?.tone.umbra,
                 prominent: row.prominent ?? false) {
            HStack(spacing: 10) {
                if let dot = row.dot { UmbraDot(dot.tone.umbra, pulse: dot.pulse ?? false) }
                if let control = row.control { ControlView(control: control, label: row.label, send: send) }
            }
        }
    }
}

struct StatusNode: View {
    let status: UiStatus

    var body: some View {
        if let until = status.countdownTo {
            TimelineView(.periodic(from: .now, by: 1)) { ctx in content(Countdown.text(to: until, now: ctx.date)) }
        } else {
            content(status.value)
        }
    }

    private func content(_ value: String?) -> some View {
        UmbraRow(status.label, hint: status.hint, value: value, symbol: status.icon?.symbol,
                 tone: status.icon?.tone.umbra ?? status.tone.umbra, prominent: true) {
            UmbraDot(status.tone.umbra, pulse: status.pulse ?? false)
        }
    }
}

struct TimerNode: View {
    let timer: UiTimer

    var body: some View {
        if let until = timer.until {
            TimelineView(.periodic(from: .now, by: 1)) { ctx in
                UmbraBigValue(Countdown.text(to: until, now: ctx.date), caption: timer.caption, tone: timer.tone?.umbra,
                              progress: progress(until: until, now: ctx.date))
            }
        } else {
            UmbraBigValue(timer.value, caption: timer.caption, tone: timer.tone?.umbra)
        }
    }

    private func progress(until: Date, now: Date) -> Double? {
        guard let from = timer.from, until > from else { return nil }
        return min(1, max(0, until.timeIntervalSince(now) / until.timeIntervalSince(from)))
    }
}

struct TabsNode: View {
    let tabs: [UiTab]
    let setting: UiSettingRef?
    let send: SendEvent
    @State private var selected: String

    init(tabs: [UiTab], initial: String?, setting: UiSettingRef?, send: @escaping SendEvent) {
        self.tabs = tabs
        self.setting = setting
        self.send = send
        _selected = State(initialValue: initial ?? tabs.first?.id ?? "")
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 18) {
            UmbraTabs(selection: Binding(get: { selected }, set: { value in
                selected = value
                if let setting { send(.setting(module: setting.module, key: setting.key, value: .string(value))) }
            }), options: tabs.map { UmbraOption($0.id, $0.label) })
            if let tab = tabs.first(where: { $0.id == selected }) {
                NodeStack(nodes: tab.children, send: send)
            }
        }
    }
}

struct ItemNode: View {
    let item: UiItem
    let send: SendEvent

    var body: some View {
        UmbraRow(item.title, hint: item.comment ?? item.copy?.value, symbol: item.icon?.symbol,
                 tone: item.icon?.tone.umbra) {
            HStack(spacing: 8) {
                ForEach(Array((item.tags ?? []).enumerated()), id: \.offset) { UmbraChip($0.element.label, tone: $0.element.tone?.umbra) }
                if let s = item.status { UmbraBadge(s.label, tone: s.tone.umbra, pulse: s.pulse ?? false) }
                if let control = item.control { ControlView(control: control, label: item.title, send: send) }
                if let actions = item.actions, !actions.isEmpty { ActionsMenu(items: actions, send: send) }
            }
        }
    }
}

struct ButtonNode: View {
    let button: UiButton
    let send: SendEvent

    var body: some View {
        Button(button.label) {
            if let confirm = button.confirm, !Confirm.ask(title: button.label, text: confirm) { return }
            send(.action(button.action))
        }
        .buttonStyle(.umbra(button.variant.umbra, size: .small))
        .disabled(button.disabled ?? false)
    }
}

struct ActionsMenu: View {
    let items: [UiMenuItem]
    let send: SendEvent

    var body: some View {
        UmbraMenuButton(items.map { item in
            UmbraMenuEntry(id: item.id, title: item.label, symbol: item.icon?.symbol, variant: item.variant.umbra,
                           hint: item.hint, disabled: item.disabled ?? false) {
                if item.form != nil {
                    _ = Confirm.ask(title: item.label, text: "Форми ще не перенесені в нову апку. Скористайся Web UI.", ok: "Зрозуміло")
                    return
                }
                if let c = item.confirm, !Confirm.ask(title: c.title, text: c.text, ok: c.ok) { return }
                send(.action(item.action))
            }
        })
    }
}

struct ControlView: View {
    let control: UiControl
    let label: String
    let send: SendEvent

    var body: some View {
        switch control {
        case .toggle(let value, let disabled, let setting, let on, let off):
            Toggle(label, isOn: Binding(get: { value }, set: { new in
                if let setting { send(.setting(module: setting.module, key: setting.key, value: .bool(new))) }
                else if let action = new ? on : off { send(.action(action)) }
            })).toggleStyle(.umbra).labelsHidden().disabled(disabled)
        case .select(let value, let options, let disabled, let setting, let action):
            UmbraSelect(label, selection: Binding(get: { value }, set: { new in
                if let setting { send(.setting(module: setting.module, key: setting.key, value: .string(new))) }
                else if var action {
                    action.params = (action.params ?? [:]).merging(["value": .string(new)]) { $1 }
                    send(.action(action))
                }
            }), options: options.map { UmbraOption($0.value, $0.label, disabled: $0.disabled ?? false) })
            .disabled(disabled)
        case .slider(let value, let min, let max, let step, let disabled, let action):
            SliderControl(label: label, value: value, range: min...max, step: step, action: action, send: send)
                .disabled(disabled)
        case .button(let button):
            ButtonNode(button: button, send: send)
        }
    }
}

/// Keeps the dragged value locally and sends it when it settles, not on every tick.
struct SliderControl: View {
    let label: String
    let range: ClosedRange<Double>
    let step: Double?
    let action: UiAction
    let send: SendEvent
    @State private var value: Double
    @State private var pending: DispatchWorkItem?

    init(label: String, value: Double, range: ClosedRange<Double>, step: Double?, action: UiAction, send: @escaping SendEvent) {
        self.label = label
        self.range = range
        self.step = step
        self.action = action
        self.send = send
        _value = State(initialValue: value)
    }

    var body: some View {
        UmbraSlider(label, value: Binding(get: { value }, set: { new in
            value = new
            pending?.cancel()
            var a = action
            a.params = (a.params ?? [:]).merging(["value": .number(new)]) { $1 }
            let work = DispatchWorkItem { send(.action(a)) }
            pending = work
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.25, execute: work)
        }), in: range, step: step)
        .frame(width: 200)
    }
}

struct TextNode: View {
    let text: String
    let tone: UiTone?
    @Environment(\.umbra) private var theme

    var body: some View {
        Text(text)
            .font(.system(size: 12))
            .foregroundStyle(tone.map { $0.umbra.color(theme.palette) } ?? theme.palette.fg3)
            .frame(maxWidth: .infinity, alignment: .leading)
    }
}
