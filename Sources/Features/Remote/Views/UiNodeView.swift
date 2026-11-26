import SwiftUI

/// Малює один вузол дерева агента. Рендерер не знає про модулі: тип вузла задає вигляд.
struct UiNodeView: View {
    let node: UiNode

    @ViewBuilder
    var body: some View {
        switch node {
        case .section(let section):
            sectionView(section)
        case .row(let row):
            UiRowView(row: row)
        case .status(let status):
            UiStatusView(status: status)
        case .toggle(let id, let label, let hint, let icon, let setting, let value, let disabled):
            UiRowView(row: UiRow(id: id, label: label, hint: hint, icon: icon,
                                 control: .toggle(value: value, disabled: disabled, setting: setting, on: nil, off: nil)))
        case .select(let id, let label, let hint, let icon, let setting, let value, let options, let disabled):
            UiRowView(row: UiRow(id: id, label: label, hint: hint, icon: icon,
                                 control: .select(value: value, options: options, disabled: disabled, setting: setting, action: nil)))
        case .buttons(_, let buttons):
            UiButtonRow(buttons: buttons)
        case .list(_, let items, let empty):
            if items.isEmpty {
                if let empty {
                    Text(empty).foregroundStyle(.secondary)
                }
            } else {
                ForEach(items) { UiListItemRow(item: $0) }
            }
        case .text(_, let text, let tone):
            Text(text).foregroundStyle(tone?.color ?? .secondary)
        case .tabs(_, let tabs, let value, let setting):
            UiTabsView(tabs: tabs, value: value, setting: setting)
        case .timer(let timer):
            UiTimerView(timer: timer)
        case .chart(let chart):
            UiChartView(chart: chart)
        case .item(let item):
            UiItemView(item: item)
        case .notice(let notice):
            UiNoticeView(notice: notice)
        case .separator(_, let word):
            UiSeparatorView(word: word)
        case .unknown:
            EmptyView()
        }
    }

    /// Секція без заголовка чи підпису не отримує порожнього місця під них. Стан і дії — праворуч у шапці.
    @ViewBuilder
    private func sectionView(_ section: UiSection) -> some View {
        let children = section.children
        let hasHeader = section.title != nil || section.status != nil || !(section.actions ?? []).isEmpty
        if hasHeader, let footer = section.footer {
            Section {
                rows(children)
            } header: {
                sectionHeader(section)
            } footer: {
                Text(footer)
            }
        } else if hasHeader {
            Section {
                rows(children)
            } header: {
                sectionHeader(section)
            }
        } else if let footer = section.footer {
            Section {
                rows(children)
            } footer: {
                Text(footer)
            }
        } else {
            Section {
                rows(children)
            }
        }
    }

    private func sectionHeader(_ section: UiSection) -> some View {
        HStack(spacing: 8) {
            Text(section.title ?? "")
            Spacer(minLength: 8)
            if let status = section.status {
                UiStatusBadgeView(status: status)
            }
            if let actions = section.actions {
                UiActionSetView(items: actions)
            }
        }
    }

    private func rows(_ children: [UiNode]) -> some View {
        ForEach(children) { UiNodeView(node: $0) }
    }
}

/// Ряд кнопок однакової ширини.
private struct UiButtonRow: View {
    let buttons: [UiButton]

    var body: some View {
        HStack(spacing: 10) {
            ForEach(buttons) { UiButtonView(button: $0).frame(maxWidth: .infinity) }
        }
    }
}

/// Елемент списку: назва, опис під нею і значення праворуч.
private struct UiListItemRow: View {
    let item: UiListItem

    var body: some View {
        HStack(alignment: .firstTextBaseline, spacing: 12) {
            VStack(alignment: .leading, spacing: 3) {
                Text(item.label)
                if let hint = item.hint {
                    Text(hint).font(.callout).foregroundStyle(.secondary)
                }
            }
            Spacer(minLength: 12)
            if let value = item.value {
                Text(value).foregroundStyle(.secondary)
            }
        }
    }
}

/// Перемикач вкладок рядком секції і рядки вибраної вкладки під ним. З `setting` вибір іде агентові.
private struct UiTabsView: View {
    let tabs: [UiTab]
    let value: String?
    let setting: UiSettingRef?
    @EnvironmentObject private var model: AwakeModel
    @State private var picked: String?

    private var current: UiTab? { tabs.first { $0.id == (picked ?? value) } ?? tabs.first }

    var body: some View {
        // До 5 вкладок — сегмент, більше — випадний список: довгий сегмент не влазить у ширину.
        if tabs.count > 5 {
            picker.pickerStyle(.menu)
        } else {
            picker.pickerStyle(.segmented)
        }
        if let current {
            ForEach(current.children) { UiNodeView(node: $0) }
        }
    }

    private var picker: some View {
        Picker("", selection: Binding(get: { current?.id ?? "" }, set: { pick($0) })) {
            ForEach(tabs) { Text($0.label).tag($0.id) }
        }
        .labelsHidden()
    }

    private func pick(_ id: String) {
        picked = id
        if let setting {
            model.sendUiEvent(.setting(module: setting.module, key: setting.key, value: .string(id)))
        }
    }
}

/// Роздільна лінія; зі словом — лінія, слово, лінія.
private struct UiSeparatorView: View {
    let word: String?

    var body: some View {
        if let word {
            HStack(spacing: 8) {
                line
                Text(word).font(.callout).foregroundStyle(.secondary)
                line
            }
        } else {
            Divider()
        }
    }

    private var line: some View {
        Rectangle().fill(.separator).frame(height: 1)
    }
}
