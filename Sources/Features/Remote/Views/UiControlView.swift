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
        case .select(let value, let options, let disabled, let setting):
            Picker("", selection: Binding(
                get: { value },
                set: { model.sendUiEvent(.setting(module: setting.module, key: setting.key, value: .string($0))) }
            )) {
                ForEach(options, id: \.value) { Text($0.label).tag($0.value) }
            }
            .pickerStyle(.menu)
            .labelsHidden()
            .fixedSize()
            .disabled(disabled)
        case .button(let button):
            UiButtonView(button: button)
        }
    }
}
