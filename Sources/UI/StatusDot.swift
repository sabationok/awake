import SwiftUI

/// Крапка стану кольором тону. `pulse` дає повільне миготіння для активного стану.
struct StatusDot: View {
    let color: Color
    var pulse = false
    @State private var dimmed = false

    var body: some View {
        Circle()
            .fill(color)
            .frame(width: 8, height: 8)
            .opacity(dimmed ? 0.35 : 1)
            .onAppear {
                guard pulse else { return }
                withAnimation(.easeInOut(duration: 1).repeatForever(autoreverses: true)) { dimmed = true }
            }
    }
}
