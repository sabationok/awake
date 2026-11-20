import SwiftUI

/// Іконка в меню-барі, під час сесії зі зворотним відліком.
struct MenuBarLabel: View {
    @EnvironmentObject private var model: AwakeModel
    @Environment(\.openWindow) private var openWindow

    var body: some View {
        HStack(spacing: 4) {
            Image(systemName: AppSymbol.cup(active: model.isRunning))
            if let remaining = model.remaining {
                Text(remaining).monospacedDigit()
            }
        }
        // Мітка живе завжди, навіть коли вікно закрите: вона й піднімає вікно з питанням «Це ви?».
        .onChange(of: model.pendingPairingRequest?.id) { _, id in
            guard id != nil else { return }
            openWindow(id: WindowID.main)
            NSApp.activate(ignoringOtherApps: true)
        }
    }
}
