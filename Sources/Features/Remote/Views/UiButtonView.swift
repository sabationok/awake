import SwiftUI

/// Кнопка дії з агента. `variant` задає стиль, `confirm` питає перед відправкою.
struct UiButtonView: View {
    let button: UiButton
    @EnvironmentObject private var model: AwakeModel
    @State private var confirming = false

    var body: some View {
        switch button.variant ?? .plain {
        case .filled:
            pressable.buttonStyle(.borderedProminent)
        case .plain:
            pressable.buttonStyle(.bordered)
        case .destructive:
            pressable.buttonStyle(.bordered).tint(.red)
        }
    }

    private var pressable: some View {
        let role: ButtonRole? = button.variant == .destructive ? .destructive : nil
        return Button(button.label) { press() }
            .disabled(button.disabled ?? false)
            .confirmationDialog(button.confirm ?? "", isPresented: $confirming, titleVisibility: .visible) {
                Button(button.label, role: role) { send() }
                Button("Скасувати", role: .cancel) {}
            }
    }

    private func press() {
        if button.confirm == nil {
            send()
        } else {
            confirming = true
        }
    }

    private func send() {
        model.sendUiEvent(.action(button.action))
    }
}
