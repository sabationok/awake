import SwiftUI

typealias SendEvent = (UiEvent) -> Void

/// Renders one contract node with Umbra components, mirroring web-umbra `sdui/node-view.tsx`.
/// Rule: a section is one card holding all its children, divided by hairlines; nothing leaves the card.
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
        case .buttons(_, let buttons): ButtonsNode(buttons: buttons, send: send)
        case .list(_, let items, let empty): ListNode(items: items, empty: empty)
        case .text(_, let text, let tone): TextNode(text: text, tone: tone)
        case .tabs(_, let tabs, let value, let setting):
            TabsNode(tabs: tabs, initial: value, setting: setting, send: send, page: false)
        case .timer(let t): TimerNode(timer: t)
        case .chart(let c): ChartNode(chart: c)
        case .item(let i): ItemNode(item: i, send: send)
        case .notice(let n): NoticeNode(notice: n, send: send)
        case .separator(_, let word): SeparatorNode(word: word)
        case .qr(_, let value, _): UmbraQrCard(value)
        case .unknown: EmptyView()
        }
    }
}

/// Top-level nodes of a page (`PageNodes`): sections and notices as they are, page tabs as a centred segmented
/// control over their own page nodes, anything else in its own panel. 18 pt between blocks.
struct PageNodes: View {
    let nodes: [UiNode]
    let send: SendEvent

    var body: some View {
        VStack(alignment: .leading, spacing: 18) {
            ForEach(nodes) { node in
                switch node {
                case .section, .notice:
                    NodeView(node: node, send: send)
                case .tabs(_, let tabs, let value, let setting):
                    TabsNode(tabs: tabs, initial: value, setting: setting, send: send, page: true)
                default:
                    UmbraPanel { NodeView(node: node, send: send) }
                }
            }
        }
    }
}

struct SectionNode: View {
    let section: UiSection
    let send: SendEvent

    private var tiles: [UiRow]? {
        guard section.kind == "summary" else { return nil }
        let rows = section.children.compactMap { if case .row(let r) = $0 { r } else { nil } }
        return rows.count == section.children.count ? rows : nil
    }

    private var hasTrailing: Bool { section.status != nil || !(section.actions ?? []).isEmpty }

    /// A section with no title, status or actions has no head row at all (as `.u-section` without `.u-section-head`).
    var body: some View {
        if section.title == nil && !hasTrailing {
            UmbraSection(nil, footer: section.footer) { content }
        } else {
            UmbraSection(section.title, footer: section.footer) { content } trailing: {
                HStack(spacing: 8) {
                    if let s = section.status { UmbraBadge(s.label, tone: s.tone.umbra, pulse: s.pulse ?? false) }
                    if let actions = section.actions, !actions.isEmpty { ActionsView(items: actions, send: send) }
                }
            }
        }
    }

    @ViewBuilder
    private var content: some View {
        if let tiles {
            UmbraTiles {
                ForEach(tiles, id: \.id) { row in
                    UmbraTile(value: row.value ?? "—", label: row.label, compare: row.compare.map {
                        UmbraCompare(deltaPct: $0.deltaPct, previous: $0.previous,
                                     goodWhen: $0.goodWhen.map { $0 == .up ? .up : .down })
                    })
                }
            }
        } else if !section.children.isEmpty {
            UmbraPanel {
                ForEach(section.children) { child in
                    switch child {
                    case .section: NodeView(node: child, send: send).padding(12)
                    case .notice: NodeView(node: child, send: send).padding(10)
                    default: NodeView(node: child, send: send)
                    }
                }
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

/// `.u-big`: countdown (or value), a progress bar while it runs, the caption. The colour goes from green to red by
/// the share of time left; without a countdown it is the node's tone.
struct TimerNode: View {
    let timer: UiTimer
    @Environment(\.umbra) private var theme

    var body: some View {
        if let until = timer.until {
            TimelineView(.periodic(from: .now, by: 1)) { ctx in
                let fraction = fraction(until: until, now: ctx.date)
                UmbraBigValue(Countdown.text(to: until, now: ctx.date), caption: timer.caption, tone: timer.tone?.umbra,
                              color: fraction.map(color), progress: fraction)
            }
        } else {
            UmbraBigValue(timer.value, caption: timer.caption, tone: timer.tone?.umbra)
        }
    }

    private func fraction(until: Date, now: Date) -> Double? {
        guard let from = timer.from, until > from else { return nil }
        return min(1, max(0, until.timeIntervalSince(now) / until.timeIntervalSince(from)))
    }

    private func color(_ fraction: Double) -> Color {
        let p = theme.palette
        let ok = NSColor(p.ok), danger = NSColor(p.danger)
        return Color(nsColor: danger.blended(withFraction: fraction, of: ok) ?? ok)
    }
}

/// Tabs node. In a card: a centred segmented control, the active tab's children under it, each after a hairline.
/// On the page level: the segmented control centred over the tab's page nodes.
struct TabsNode: View {
    let tabs: [UiTab]
    let setting: UiSettingRef?
    let send: SendEvent
    let page: Bool
    @State private var selected: String

    init(tabs: [UiTab], initial: String?, setting: UiSettingRef?, send: @escaping SendEvent, page: Bool) {
        self.tabs = tabs
        self.setting = setting
        self.send = send
        self.page = page
        _selected = State(initialValue: initial ?? tabs.first?.id ?? "")
    }

    private var active: UiTab? { tabs.first { $0.id == selected } ?? tabs.first }

    private var control: some View {
        UmbraSegmented(selection: Binding(get: { active?.id ?? "" }, set: { value in
            selected = value
            if let setting { send(.setting(module: setting.module, key: setting.key, value: .string(value))) }
        }), options: tabs.map { UmbraOption($0.id, $0.label) })
        .fixedSize()
        .frame(maxWidth: .infinity)
    }

    var body: some View {
        if page {
            VStack(alignment: .leading, spacing: 18) {
                control
                PageNodes(nodes: active?.children ?? [], send: send)
            }
        } else {
            UmbraDivided {
                control.padding(12)
                ForEach(active?.children ?? []) { NodeView(node: $0, send: send) }
            }
        }
    }
}

/// `ButtonsNode`: buttons share the card's width equally, 8 pt apart, 12 pt inside.
struct ButtonsNode: View {
    let buttons: [UiButton]
    let send: SendEvent

    var body: some View {
        HStack(spacing: 8) {
            ForEach(buttons) { ButtonNode(button: $0, send: send, fill: true) }
        }
        .padding(12)
    }
}

struct ListNode: View {
    let items: [UiListItem]
    let empty: String?

    var body: some View {
        if items.isEmpty {
            UmbraEmptyState(empty ?? "Поки порожньо", symbol: "tray")
        } else {
            UmbraDivided {
                ForEach(items) { UmbraListRow($0.label, subtitle: $0.hint, trailing: $0.value ?? "") }
            }
        }
    }
}

/// `.u-item`: head (icon, title, status, control, one action or a menu), tags, copy field, comment.
struct ItemNode: View {
    let item: UiItem
    let send: SendEvent
    @Environment(\.umbra) private var theme

    var body: some View {
        let p = theme.palette
        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 12) {
                if let icon = item.icon { UmbraRowIcon(icon.symbol, tone: icon.tone.umbra) }
                Text(item.title).font(.system(size: 14, weight: .semibold)).foregroundStyle(p.fg)
                    .frame(maxWidth: .infinity, alignment: .leading)
                if let s = item.status { UmbraBadge(s.label, tone: s.tone.umbra, pulse: s.pulse ?? false) }
                if let control = item.control { ControlView(control: control, label: item.title, send: send) }
                if let actions = item.actions, !actions.isEmpty { ActionsView(items: actions, send: send) }
            }
            if let tags = item.tags, !tags.isEmpty {
                HStack(spacing: 6) {
                    ForEach(Array(tags.enumerated()), id: \.offset) { UmbraChip($0.element.label, tone: $0.element.tone?.umbra) }
                }
            }
            if let copy = item.copy { UmbraCopyField(copy.value, caption: copy.label) }
            if let comment = item.comment {
                Text(comment).font(UmbraFont.xs).foregroundStyle(p.fg3).lineSpacing(2)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
        .padding(14)
    }
}

struct NoticeNode: View {
    let notice: UiNotice
    let send: SendEvent

    var body: some View {
        UmbraNotice(tone: notice.variant.tone, symbol: notice.icon?.symbol ?? defaultSymbol,
                    title: notice.title ?? notice.text, text: notice.title == nil ? nil : notice.text) {
            if let dismiss = notice.dismiss {
                Button("Закрити") { send(.action(dismiss)) }.buttonStyle(.umbra(.ghost, size: .small))
            }
        }
    }

    private var defaultSymbol: String {
        switch notice.variant {
        case .info: "info.circle"
        case .warn: "exclamationmark.triangle"
        case .error: "xmark.circle"
        }
    }
}

struct SeparatorNode: View {
    let word: String?
    @Environment(\.umbra) private var theme

    var body: some View {
        let p = theme.palette
        HStack(spacing: 12) {
            Rectangle().fill(p.line).frame(height: 1)
            if let word {
                Text(word).font(UmbraFont.xs).foregroundStyle(p.fg3)
                Rectangle().fill(p.line).frame(height: 1)
            }
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 10)
    }
}

/// One action: a small button; two or more: the «⋯» menu. `scope: mac` items are greyed with a hint.
struct ActionsView: View {
    let items: [UiMenuItem]
    let send: SendEvent

    var body: some View {
        if items.count == 1, let item = items.first {
            Button(item.label) { MenuAction.run(item, send: send) }
                .buttonStyle(.umbra(item.variant.umbra, size: .small))
                .disabled(MenuAction.disabled(item))
                .help(MenuAction.hint(item) ?? "")
        } else {
            UmbraMenuButton(items.map { item in
                UmbraMenuEntry(id: item.id, title: item.label, symbol: item.icon?.symbol, variant: item.variant.umbra,
                               hint: MenuAction.hint(item), disabled: MenuAction.disabled(item)) {
                    MenuAction.run(item, send: send)
                }
            })
        }
    }
}

@MainActor
enum MenuAction {
    /// The server already resolved the list by state; `scope: mac` items are active here (the Mac is that scope).
    static func disabled(_ item: UiMenuItem) -> Bool { item.disabled ?? false }
    static func hint(_ item: UiMenuItem) -> String? { item.hint }

    static func run(_ item: UiMenuItem, send: SendEvent) {
        if item.form != nil {
            _ = Confirm.ask(title: item.label, text: "Форми ще не перенесені в нову апку. Скористайся Web UI.", ok: "Зрозуміло")
            return
        }
        if let c = item.confirm, !Confirm.ask(title: c.title, text: c.text, ok: c.ok) { return }
        send(.action(item.action))
    }
}

struct ButtonNode: View {
    let button: UiButton
    let send: SendEvent
    var fill = false

    var body: some View {
        Button {
            if let confirm = button.confirm, !Confirm.ask(title: button.label, text: confirm) { return }
            send(.action(button.action))
        } label: {
            Text(button.label).frame(maxWidth: fill ? .infinity : nil)
        }
        .buttonStyle(.umbra(button.variant.umbra, size: fill ? .regular : .small))
        .disabled(button.disabled ?? false)
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
        HStack(spacing: 10) {
            UmbraSlider(label, value: Binding(get: { value }, set: { new in
                value = new
                pending?.cancel()
                var a = action
                a.params = (a.params ?? [:]).merging(["value": .number(new)]) { $1 }
                let work = DispatchWorkItem { send(.action(a)) }
                pending = work
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.25, execute: work)
            }), in: range, step: step)
            .frame(width: 160)
            Text("\(Int(value.rounded()))").font(UmbraFont.sm.monospacedDigit()).frame(width: 34, alignment: .trailing)
        }
    }
}

/// `text` node: muted paragraph with 12 / 14 pt padding, coloured when the node has a tone.
struct TextNode: View {
    let text: String
    let tone: UiTone?
    @Environment(\.umbra) private var theme

    var body: some View {
        Text(text)
            .font(UmbraFont.xs)
            .lineSpacing(2)
            .foregroundStyle(tone.map { $0.umbra.color(theme.palette) } ?? theme.palette.fg3)
            .frame(maxWidth: .infinity, alignment: .leading)
            .fixedSize(horizontal: false, vertical: true)
            .padding(.horizontal, 14)
            .padding(.vertical, 12)
    }
}
