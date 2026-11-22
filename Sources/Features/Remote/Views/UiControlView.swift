import SwiftUI

/// Керування праворуч у рядку. Кожна зміна йде агентові через модель.
struct UiControlView: View {
    let control: UiControl
    @EnvironmentObject private var model: AwakeModel

    var body: some View {
        switch control {
        case .toggle(let value, let disabled, let setting, let on, let off):
            Toggle("", isOn: Binding(
                get: { value },
                set: { flag in
                    if let setting {
                        model.sendUiEvent(.setting(module: setting.module, key: setting.key, value: .bool(flag)))
                    } else if let action = flag ? on : off {
                        model.sendUiEvent(.action(action))
                    }
                }
            ))
            .toggleStyle(.switch)
            .labelsHidden()
            .disabled(disabled)
        case .select(let value, let options, let disabled, let setting, let action):
            let choose: (String) -> Void = { chosen in
                // Сіра опція не вибирається, навіть якщо меню її пропустило.
                guard options.first(where: { $0.value == chosen })?.disabled != true else { return }
                if let setting {
                    model.sendUiEvent(.setting(module: setting.module, key: setting.key, value: .string(chosen)))
                } else if let action {
                    model.sendUiEvent(.action(action.with(value: .string(chosen))))
                }
            }
            if options.contains(where: { $0.disabled == true }) {
                // Пункти Picker-меню в macOS ігнорують .disabled, а кнопки в Menu — ні.
                Menu(options.first { $0.value == value }?.label ?? value) {
                    ForEach(options, id: \.value) { option in
                        Button(option.label) { choose(option.value) }
                            .disabled(option.disabled == true)
                    }
                }
                .menuStyle(.button)
                .fixedSize()
                .disabled(disabled)
            } else {
                Picker("", selection: Binding(get: { value }, set: choose)) {
                    ForEach(options, id: \.value) { Text($0.label).tag($0.value) }
                }
                .pickerStyle(.menu)
                .labelsHidden()
                .fixedSize()
                .disabled(disabled)
            }
        case .slider(let value, let min, let max, let step, let disabled, let action):
            UiSliderView(value: value, range: min...max, step: step, disabled: disabled) { chosen in
                model.sendUiEvent(.action(action.with(value: .number(chosen))))
            }
        case .button(let button):
            UiButtonView(button: button)
        }
    }
}

/// Повзунок тримає своє значення, поки його тягнуть, і шле його раз, коли відпустили.
/// Нове значення з дерева (агент оновив стан) перезаписує його.
private struct UiSliderView: View {
    let value: Double
    let range: ClosedRange<Double>
    let step: Double?
    let disabled: Bool
    let onCommit: (Double) -> Void
    @State private var draft: Double?

    var body: some View {
        let binding = Binding(get: { draft ?? value }, set: { draft = $0 })
        Group {
            if let step {
                Slider(value: binding, in: range, step: step) { editing in commit(editing) }
            } else {
                Slider(value: binding, in: range) { editing in commit(editing) }
            }
        }
        .labelsHidden()
        .frame(width: 160)
        .disabled(disabled)
        .onChange(of: value) { _, _ in draft = nil }
    }

    private func commit(_ editing: Bool) {
        guard !editing, let draft, draft != value else { return }
        onCommit(draft)
    }
}

extension UiAction {
    /// Та сама дія з `params.value`: вибір або повзунок дописують своє значення.
    func with(value: UiScalar) -> UiAction {
        var copy = self
        copy.params = (params ?? [:]).merging(["value": value]) { _, new in new }
        return copy
    }
}
