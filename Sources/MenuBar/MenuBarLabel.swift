import SwiftUI

/// Іконка в меню-барі, під час сесії зі зворотним відліком.
struct MenuBarLabel: View {
    @EnvironmentObject private var model: AwakeModel

    var body: some View {
        HStack(spacing: 4) {
            Image(systemName: AppSymbol.cup(active: model.isRunning))
            if let remaining = model.remaining {
                Text(remaining).monospacedDigit()
            }
        }
    }
}
