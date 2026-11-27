import SwiftUI

/// `Toggle("Label", isOn: $on).toggleStyle(.umbra)`: the 32×19 switch of `.u-switch`. The label is only for
/// accessibility; place visible text in an `UmbraRow`.
public struct UmbraSwitchStyle: ToggleStyle {
    public init() {}

    public func makeBody(configuration: Configuration) -> some View {
        UmbraSwitchBody(configuration: configuration)
    }
}

public extension ToggleStyle where Self == UmbraSwitchStyle {
    static var umbra: UmbraSwitchStyle { UmbraSwitchStyle() }
}

private struct UmbraSwitchBody: View {
    let configuration: ToggleStyle.Configuration
    @Environment(\.isEnabled) private var isEnabled
    @Environment(\.umbra) private var theme

    var body: some View {
        let p = theme.palette
        let on = configuration.isOn
        Capsule()
            .fill(on ? p.accent : p.surface3)
            .frame(width: 32, height: 19)
            .overlay(alignment: on ? .trailing : .leading) {
                Circle()
                    .fill(on ? Color.white : p.switchKnob)
                    .frame(width: 15, height: 15)
                    .padding(2)
                    .shadow(color: .black.opacity(0.2), radius: 1, y: 0.5)
            }
            .animation(UmbraMotion.ease, value: on)
            .opacity(isEnabled ? 1 : 0.4)
            .contentShape(Capsule())
            .onTapGesture { if isEnabled { configuration.isOn.toggle() } }
            .accessibilityRepresentation {
                Toggle(isOn: configuration.$isOn) { configuration.label }
            }
    }
}
