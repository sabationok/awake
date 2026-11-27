import SwiftUI

/// Port of `web-umbra/src/sdui/node-view.tsx`: one view per node, same names, same layout inside, drawn only with
/// swift-umbra-lib components. Order follows the web file: time, dispatcher, section, rows & controls, chart, item,
/// notice / qr.

typealias SendEvent = (UiEvent) -> Void

/* ---------- time ---------- */

/// `remaining`: H:MM:SS until `until`, nil when it has passed.
func remaining(_ until: Date?, _ now: Date) -> String? {
    guard let until else { return nil }
    let s = Int(until.timeIntervalSince(now))
    guard s > 0 else { return nil }
    return String(format: "%d:%02d:%02d", s / 3600, s / 60 % 60, s % 60)
}

/// `useNow`: redraws every second while `active`, like the web hook's interval.
struct Ticking<Content: View>: View {
    let active: Bool
    @ViewBuilder let content: (Date) -> Content

    var body: some View {
        if active {
            TimelineView(.periodic(from: .now, by: 1)) { ctx in content(ctx.date) }
        } else {
            content(.now)
        }
    }
}

/* ---------- dispatcher ---------- */

struct NodeView: View {
    let node: UiNode
    let send: SendEvent
    @Environment(\.sduiSkeleton) private var skeleton

    var body: some View {
        switch node {
        case .section(let s): SectionNode(node: s, send: send)
        case .row(let r): RowNode(node: r, send: send)
        case .status(let s): StatusNode(node: s)
        case .toggle(let id, let label, let hint, let icon, let setting, let value, let disabled):
            SettingSwitchNode(id: id, label: label, hint: hint, icon: icon, setting: setting, value: value,
                              disabled: disabled, send: send)
        case .select(let id, let label, let hint, let icon, let setting, let value, let options, let disabled):
            SettingSelectNode(id: id, label: label, hint: hint, icon: icon, setting: setting, value: value,
                              options: options, disabled: disabled, send: send)
        case .buttons(_, let buttons): ButtonsNode(buttons: buttons, send: send)
        case .list(_, let items, let empty): ListNode(items: items, empty: empty)
        // `<p class="u-section-foot" style="padding: 12px 14px">`
        case .text(_, let text, let tone): Note(text, tone: tone?.umbra)
        case .tabs(_, let tabs, let value, let setting):
            TabsNode(tabs: tabs, value: value, setting: setting, send: send, page: false)
        case .timer(let t): TimerNode(node: t)
        case .chart(let c):
            if skeleton { ChartSkeleton(c.title) } else { ChartNode(node: c).equatable() }
        case .item(let i): ItemNode(node: i, send: send)
        case .notice(let n): NoticeNode(node: n, send: send)
        // `.u-sep`, padding 10 14
        case .separator(_, let word): Separator(word)
        case .qr(_, let value, _): QrNode(value: value)
        case .unknown: EmptyView()
        }
    }
}

/// Top-level nodes of a page: sections and notices as they are, page tabs over their own page nodes, anything else
/// in its own panel. 18 pt between blocks (`.s-content` gap).
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
                    // Page-level tabs (stats period): each section of the tab is its own block, not one panel.
                    TabsNode(tabs: tabs, value: value, setting: setting, send: send, page: true)
                default:
                    Panel { NodeView(node: node, send: send) }
                }
            }
        }
    }
}

/* ---------- section ---------- */

/// One action: a small button; two or more: `MenuOf`. The server already resolved the list by state; `scope: mac`
/// items are active here (the Mac is that scope).
struct SectionActions: View {
    let actions: [UiMenuItem]
    let send: SendEvent
    @EnvironmentObject private var runner: RunAction

    var body: some View {
        if actions.count == 1, let first = actions.first {
            Button(first.label) { runner.run(fromMenuItem(first), send: send) }
                .buttonStyle(.umbra(first.variant.umbra, size: .small))
                .disabled(first.disabled ?? false)
                .help(first.hint ?? "")
        } else if !actions.isEmpty {
            MenuOf(items: actions, send: send)
        }
    }
}

/// `MenuOf`: the «⋯» menu (`DotMenu`).
struct MenuOf: View {
    let items: [UiMenuItem]
    let send: SendEvent
    @EnvironmentObject private var runner: RunAction

    var body: some View {
        MenuButton(items.map { item in
            MenuEntry(id: item.id, title: item.label, symbol: item.icon?.symbol, variant: item.variant.umbra,
                           hint: item.hint, disabled: item.disabled ?? false) { runner.run(fromMenuItem(item), send: send) }
        })
    }
}

/// `.u-section`: head (title, status badge, actions), then a summary as tiles or one panel holding every child,
/// then the footer. A nested section gets 12 pt padding, a nested notice 10 pt.
struct SectionNode: View {
    let node: UiSection
    let send: SendEvent

    private var tiles: [UiRow]? {
        guard node.kind == "summary" else { return nil }
        let rows = node.children.compactMap { if case .row(let r) = $0 { r } else { nil } }
        return rows.count == node.children.count ? rows : nil
    }

    private var hasHead: Bool { node.title != nil || node.status != nil || !(node.actions ?? []).isEmpty }

    var body: some View {
        if hasHead {
            Section(node.title, footer: node.footer) { content } trailing: {
                HStack(spacing: 8) {
                    if let s = node.status { Badge(s.label, tone: s.tone.umbra, pulse: s.pulse ?? false) }
                    if let actions = node.actions, !actions.isEmpty { SectionActions(actions: actions, send: send) }
                }
            }
        } else {
            Section(nil, footer: node.footer) { content }
        }
    }

    @ViewBuilder
    private var content: some View {
        if let tiles {
            Tiles { ForEach(tiles, id: \.id) { TileNode(node: $0) } }
        } else if !node.children.isEmpty {
            Panel {
                ForEach(node.children) { child in
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

/// `TileNode`: label, big number and, when the server gave one, the change against the previous period.
struct TileNode: View {
    let node: UiRow

    var body: some View {
        Tile(value: node.value ?? "—", label: node.label, compare: node.compare.map {
            Compare(deltaPct: $0.deltaPct, previous: $0.previous, goodWhen: $0.goodWhen.map { $0 == .up ? .up : .down })
        })
    }
}

/* ---------- rows & controls ---------- */

struct ControlView: View {
    let id: String
    let control: UiControl
    let label: String
    let send: SendEvent
    @EnvironmentObject private var runner: RunAction

    var body: some View {
        switch control {
        case .toggle(let value, let disabled, let setting, let on, let off):
            Toggle(label, isOn: Binding(get: { value }, set: { next in
                if let setting { send(.setting(module: setting.module, key: setting.key, value: .bool(next))) }
                else if let action = next ? on : off { send(.action(action)) }
            })).toggleStyle(.umbra).labelsHidden().disabled(disabled)
        case .select(let value, let options, let disabled, let setting, let action):
            Select(label, selection: Binding(get: { value }, set: { next in
                if let setting { send(.setting(module: setting.module, key: setting.key, value: .string(next))) }
                else if var action {
                    action.params = (action.params ?? [:]).merging(["value": .string(next)]) { $1 }
                    send(.action(action))
                }
            }), options: options.map { Option($0.value, $0.label, disabled: $0.disabled ?? false) })
            .disabled(disabled)
        case .slider(let value, let min, let max, let step, let disabled, let action):
            SliderControl(label: label, value: value, range: min...max, step: step, action: action, send: send)
                .disabled(disabled)
        case .button(let button):
            Button(button.label) { runner.run(fromButton(button), send: send) }
                .buttonStyle(.umbra(button.variant.umbra, size: .small))
                .disabled(button.disabled ?? false)
        }
    }
}

/// `Slider` + `.u-row-value` (34 pt): keeps the dragged value locally, sends it on release.
struct SliderControl: View {
    let label: String
    let range: ClosedRange<Double>
    let step: Double?
    let action: UiAction
    let send: SendEvent
    @State private var value: Double

    init(label: String, value: Double, range: ClosedRange<Double>, step: Double?, action: UiAction, send: @escaping SendEvent) {
        self.label = label
        self.range = range
        self.step = step
        self.action = action
        self.send = send
        _value = State(initialValue: value)
    }

    var body: some View {
        Slider(label, value: $value, in: range, step: step, showsValue: true) { v in
            var a = action
            a.params = (a.params ?? [:]).merging(["value": .number(v)]) { $1 }
            send(.action(a))
        }
        .frame(width: 160 + 10 + 34)
    }
}

/// `.u-row`: icon, label over the hint (dot + hint · countdown), then the control, or the value when there is none.
struct RowNode: View {
    let node: UiRow
    let send: SendEvent

    var body: some View {
        Ticking(active: node.countdownTo != nil) { now in
            let hint = [node.hint, remaining(node.countdownTo, now)].compactMap { $0 }.filter { !$0.isEmpty }
                .joined(separator: " · ")
            Row(node.label, hint: hint.isEmpty ? nil : hint, value: node.control == nil ? node.value : nil,
                     symbol: node.icon?.symbol, tone: node.icon?.tone.umbra, prominent: node.prominent ?? false) {
                HStack(spacing: 10) {
                    if let dot = node.dot { Dot(dot.tone.umbra, pulse: dot.pulse ?? false) }
                    if let control = node.control { ControlView(id: node.id, control: control, label: node.label, send: send) }
                }
            }
        }
    }
}

/// `StatusNode`: a prominent row in the node's tone; the countdown (or value) on the right.
struct StatusNode: View {
    let node: UiStatus

    var body: some View {
        Ticking(active: node.countdownTo != nil) { now in
            Row(node.label, hint: node.hint, value: remaining(node.countdownTo, now) ?? node.value,
                     symbol: node.icon?.symbol, tone: node.icon?.tone.umbra ?? node.tone.umbra, prominent: true) {
                if node.icon == nil { Dot(node.tone.umbra, pulse: node.pulse ?? false) }
            }
        }
    }
}

/// `SettingSwitchNode`: a `switch` node is a row with a switch control bound to the setting.
struct SettingSwitchNode: View {
    let id: String, label: String, hint: String?, icon: UiIcon?, setting: UiSettingRef, value: Bool, disabled: Bool
    let send: SendEvent

    var body: some View {
        RowNode(node: UiRow(id: id, label: label, hint: hint, icon: icon,
                            control: .toggle(value: value, disabled: disabled, setting: setting, on: nil, off: nil)),
                send: send)
    }
}

/// `SettingSelectNode`: a `select` node is a row with a select control bound to the setting.
struct SettingSelectNode: View {
    let id: String, label: String, hint: String?, icon: UiIcon?, setting: UiSettingRef, value: String
    let options: [UiOption], disabled: Bool
    let send: SendEvent

    var body: some View {
        RowNode(node: UiRow(id: id, label: label, hint: hint, icon: icon,
                            control: .select(value: value, options: options, disabled: disabled, setting: setting,
                                             action: nil)),
                send: send)
    }
}

/// `ButtonsNode`: `grid-template-columns: repeat(auto-fit, minmax(120px, 1fr))`, gap 8, padding 12 — full-width
/// buttons that wrap to the next line when there is no room.
struct ButtonsNode: View {
    let buttons: [UiButton]
    let send: SendEvent
    @EnvironmentObject private var runner: RunAction

    var body: some View {
        FitGrid(minimum: 120, spacing: 8) {
            ForEach(buttons) { button in
                Button { runner.run(fromButton(button), send: send) } label: {
                    Text(button.label).frame(maxWidth: .infinity)
                }
                .buttonStyle(.umbra(button.variant.umbra))
                .disabled(button.disabled ?? false)
            }
        }
        .padding(12)
    }
}

/// `ListNode`: `.u-list-row`s with a hairline between them, or the empty state.
struct ListNode: View {
    let items: [UiListItem]
    let empty: String?

    var body: some View {
        if items.isEmpty {
            EmptyState(empty ?? "Поки порожньо", symbol: "tray")
        } else {
            Divided {
                ForEach(items) { ListRow($0.label, subtitle: $0.hint, trailing: $0.value ?? "") }
            }
        }
    }
}

/// `TabsNode`: always a segmented control (modes inside a page). In a panel: centred, 12 pt padding, the active
/// tab's children each after a hairline. On the page: `.u-page-tabs` over the tab's `PageNodes`.
struct TabsNode: View {
    let tabs: [UiTab]
    let setting: UiSettingRef?
    let send: SendEvent
    let page: Bool
    /// The segment the thumb shows and whose content is drawn: set at once, the thumb animates.
    @State private var value: String
    /// The tab whose charts are built. Lags `value` by one frame: on the first frame the new tab draws its sections
    /// with `ChartSkeleton` in place of the charts, so the switch never waits for the chart build.
    @State private var built: String

    init(tabs: [UiTab], value: String?, setting: UiSettingRef?, send: @escaping SendEvent, page: Bool) {
        self.tabs = tabs
        self.setting = setting
        self.send = send
        self.page = page
        let initial = value ?? tabs.first?.id ?? ""
        _value = State(initialValue: initial)
        _built = State(initialValue: initial)
    }

    private var active: UiTab? { tabs.first { $0.id == value } ?? tabs.first }
    private var pending: Bool { value != built }

    private func select(_ next: String) {
        show(next)
        if let setting { send(.setting(module: setting.module, key: setting.key, value: .string(next))) }
    }

    /// Thumb and sections now, charts on the next frame. Only the thumb animates: the content swaps without a
    /// transaction animation (Charts would otherwise morph every bar from the old tab to the new one). Local only (`--perf` switches through here, it never sends).
    private func show(_ next: String) {
        withAnimation(.snappy(duration: 0.18)) { value = next }
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.0 / 60) { if value == next { built = next } }
    }

    private var segmented: some View {
        Segmented(selection: Binding(get: { tabs.contains { $0.id == value } ? value : tabs.first?.id ?? "" },
                                          set: select),
                       options: tabs.map { Option($0.id, $0.label) })
        .fixedSize()
        .frame(maxWidth: .infinity)
    }

    var body: some View {
        if page {
            VStack(alignment: .leading, spacing: 18) {
                segmented
                PageNodes(nodes: active?.children ?? [], send: send)
                    .environment(\.sduiSkeleton, pending)
                    .transaction { $0.animation = nil }
            }
            .onReceive(NotificationCenter.default.publisher(for: PerfProbe.tabSwitch)) { note in
                if let next = note.object as? String, tabs.contains(where: { $0.id == next }) { show(next) }
            }
        } else {
            Divided {
                segmented.padding(12)
                ForEach(active?.children ?? []) { NodeView(node: $0, send: send) }
                    .environment(\.sduiSkeleton, pending)
                    .transaction { $0.animation = nil }
            }
        }
    }
}

/// `.u-big`: countdown (or value), a progress bar while it runs, the caption. The colour goes from green to red by
/// the share of time left (`color-mix(ok, danger)`); without a countdown it is the node's tone.
struct TimerNode: View {
    let node: UiTimer
    @Environment(\.umbra) private var theme

    var body: some View {
        Ticking(active: node.until != nil) { now in
            let left = remaining(node.until, now)
            let fraction = left == nil ? nil : fraction(now)
            BigValue(left ?? node.value, caption: node.caption, tone: node.tone?.umbra,
                          color: fraction.map(color), progress: fraction)
        }
    }

    private func fraction(_ now: Date) -> Double? {
        guard let from = node.from, let until = node.until, until > from else { return nil }
        return min(1, max(0, until.timeIntervalSince(now) / until.timeIntervalSince(from)))
    }

    private func color(_ fraction: Double) -> Color {
        let ok = NSColor(theme.palette.ok), danger = NSColor(theme.palette.danger)
        return Color(nsColor: danger.blended(withFraction: fraction, of: ok) ?? ok)
    }
}

/* ---------- chart ---------- */

private let ukLocale = Locale(identifier: "uk_UA")
private func dateFormatter(_ template: String) -> DateFormatter {
    let f = DateFormatter()
    f.locale = ukLocale
    f.setLocalizedDateFormatFromTemplate(template)
    return f
}
private let timeFormat = dateFormatter("HH:mm")
private let monthFormat = dateFormatter("LLL")
private let dayFormat = dateFormatter("d MMM")

func formatValue(_ value: Double, _ format: UiChart.Format?) -> String {
    switch format {
    case .duration:
        let h = Int(value / 3600), m = Int((value.truncatingRemainder(dividingBy: 3600) / 60).rounded())
        return h > 0 ? "\(h) год \(m) хв" : "\(m) хв"
    case .bytes: return value > 1e6 ? String(format: "%.1f МБ", value / 1e6) : "\(Int((value / 1e3).rounded())) КБ"
    case .percent: return "\(Int(value.rounded()))%"
    case .number: return String(format: "%.1f", value)
    case .count, nil: return "\(Int(value.rounded()))"
    }
}

func formatBucket(_ date: Date, _ unit: UiChart.Unit) -> String {
    switch unit {
    case .minute, .hour: timeFormat.string(from: date)
    case .month: monthFormat.string(from: date)
    case .day, .week: dayFormat.string(from: date)
    }
}

/// `ChartNode` → `Chart` (`.u-chart`): head with the hovered bucket, bars, axis, legend.
/// Equatable: a tree pushed again with the same points skips the chart's body (`.equatable()` at the call site).
struct ChartNode: View, Equatable {
    let node: UiChart

    var body: some View {
        Chart(node.title,
                   points: node.points.map { ChartPoint(start: $0.start, value: $0.value, series: $0.series ?? "") },
                   tone: node.tone?.umbra ?? .accent,
                   tones: (node.tones ?? [:]).mapValues(\.umbra),
                   limit: node.limit,
                   bucketLabel: { formatBucket($0, node.unit) },
                   valueLabel: { formatValue($0, node.format) })
    }
}

/* ---------- item ---------- */

/// `.u-item`: head (icon, title, badge, control, one action or the menu), tags, `CopyValue`, comment.
struct ItemNode: View {
    let node: UiItem
    let send: SendEvent

    var body: some View {
        Item(node.title, symbol: node.icon?.symbol, tone: node.icon?.tone.umbra, copy: node.copy?.value,
                  copyCaption: node.copy?.label, comment: node.comment) {
            ForEach(Array((node.tags ?? []).enumerated()), id: \.offset) { Chip($0.element.label, tone: $0.element.tone?.umbra) }
        } trailing: {
            if let s = node.status { Badge(s.label, tone: s.tone.umbra, pulse: s.pulse ?? false) }
            if let control = node.control { ControlView(id: node.id, control: control, label: node.title, send: send) }
            if let actions = node.actions, !actions.isEmpty { SectionActions(actions: actions, send: send) }
        }
    }
}

/* ---------- notice / qr ---------- */

/// `.u-notice`: icon in the variant's tone, title over the text, a close button when the server allows it.
struct NoticeNode: View {
    let node: UiNotice
    let send: SendEvent

    var body: some View {
        Notice(tone: node.variant.tone, symbol: node.icon?.symbol ?? symbol,
                    title: node.title ?? node.text, text: node.title == nil ? nil : node.text) {
            if let dismiss = node.dismiss {
                IconButton("xmark", label: "Закрити") { send(.action(dismiss)) }
            }
        }
    }

    private var symbol: String {
        switch node.variant {
        case .info: "info.circle"
        case .warn: "exclamationmark.triangle"
        case .error: "xmark.circle"
        }
    }
}

/// `QrNode`: the MaControl-style code (rounded finder eyes, dot modules on white) at 160 pt; a click opens it
/// enlarged in a dialog. Here the code is real: the Mac is the scope that shows it.
struct QrNode: View {
    let value: String
    var body: some View { QrCard(value) }
}

/// True while a tab's content is on its first frame: heavy nodes (charts) draw a skeleton of their size instead.
private struct SduiSkeletonKey: EnvironmentKey { static let defaultValue = false }

extension EnvironmentValues {
    var sduiSkeleton: Bool {
        get { self[SduiSkeletonKey.self] }
        set { self[SduiSkeletonKey.self] = newValue }
    }
}
